package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var visitors = make(map[string]*rate.Limiter)

func getLimiter(ip string) *rate.Limiter {
    if l, exists := visitors[ip]; exists {
        return l
    }
    limiter := rate.NewLimiter(1, 3)
    visitors[ip] = limiter
    return limiter
}


func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getLimiter(ip)
		
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}
	}
}
