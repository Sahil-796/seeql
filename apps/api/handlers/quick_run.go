package handlers

import (
	"github.com/Sahil-796/seeql/internal/modes"
	"github.com/gin-gonic/gin"
	"net/http"
)

type RunRequest struct {
	SQL string `json:"sql" binding:"required"`
}

func QuickRun(c *gin.Context) {
	var req RunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mode, err := modes.NewMode(modes.ModeQuick)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer mode.Close()

	result, err := mode.Run(req.SQL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
