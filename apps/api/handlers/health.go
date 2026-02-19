package handlers

import (
	"net/http"

	"github.com/Sahil-796/seeql/internal/db"
	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Status string `json:"status"`
	Redis  string `json:"redis"`
}

func Health(c *gin.Context) {
	redisStatus := "ok"
	if err := db.PingRedis(); err != nil {
		redisStatus = "error: " + err.Error()
		c.JSON(http.StatusServiceUnavailable, HealthResponse{Status: "error", Redis: redisStatus})
		return
	}

	c.JSON(http.StatusOK, HealthResponse{Status: "ok", Redis: redisStatus})
}
