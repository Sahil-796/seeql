package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

const visitorTTL = 10 * time.Minute

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	visitors = make(map[string]*visitor)
	mu       sync.RWMutex
)

func init() {
	go cleanupVisitors()
}

func cleanupVisitors() {
	ticker := time.NewTicker(visitorTTL)
	for range ticker.C {
		mu.Lock()
		for ip, v := range visitors {
			if time.Since(v.lastSeen) > visitorTTL {
				delete(visitors, ip)
			}
		}
		mu.Unlock()
	}
}

func getClientIP(c *gin.Context) string {
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := c.GetHeader("X-Real-Ip")
	if realIP != "" {
		return realIP
	}

	return c.ClientIP()
}

func getLimiter(ip string, r rate.Limit, b int) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	if v, exists := visitors[ip]; exists {
		v.lastSeen = time.Now()
		return v.limiter
	}
	limiter := rate.NewLimiter(r, b)
	visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
	return limiter
}

func RateLimitMiddleware(r rate.Limit, b int) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := getClientIP(c)

		if ip == "" {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Unable to identify client"})
			c.Abort()
			return
		}

		limiter := getLimiter(ip, r, b)

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}

		c.Next()
	}
}
