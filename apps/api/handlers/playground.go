package handlers

import (
	"net/http"

	"github.com/Sahil-796/seeql/internal/db"
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
