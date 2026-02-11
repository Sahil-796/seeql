package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/Sahil-796/seeql/internal/db"
	"github.com/Sahil-796/seeql/internal/modes"
	"github.com/gin-gonic/gin"
)

var SessionManager *db.SessionManager

func CreateSession(c *gin.Context) {
	session, err := SessionManager.CreateSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session_id": session.ID, "created_at": session.CreatedAt})
}

func CloseSession(c *gin.Context) {
	sessionID := c.Param("id")
	err := SessionManager.CloseSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session closed successfully"})
}

type PlaygroundExecuteRequest struct {
	SQL string `json:"sql" binding:"required"`
}

func ExecutePlaygroundQuery(c *gin.Context) {
	sessionID := c.Param("id")

	session, err := SessionManager.GetSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	var req PlaygroundExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mode, err := modes.NewMode(modes.ModePlayground, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	result, err := mode.Run(ctx, req.SQL)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
