package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"github.com/Sahil-796/seeql/internal/modes"
)

type RunRequest struct {
	sql string
}

func QuickRun(c *gin.Context) {
	
	var req RunRequest
	
	q := modes.NewQuickMode()
	q.Run(req.sql)
	c.JSON(http.StatusOK, HealthResponse{Status: "ok"})
}