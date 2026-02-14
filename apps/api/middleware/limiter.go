package middleware

import (
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var (
	visitors = make(map[string]*rate.Limiter)
	mu       sync.RWMutex
)

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

	if l, exists := visitors[ip]; exists {
		return l
	}
	limiter := rate.NewLimiter(r, b)
	visitors[ip] = limiter
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
