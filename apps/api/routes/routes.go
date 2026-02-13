package routes

import (
	"os"

	"github.com/Sahil-796/seeql/apps/api/handlers"
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data/sessions"
	}
	handlers.SessionManager = db.NewSessionManager(dataDir)

	r.POST("/quick-run", handlers.QuickRun)

	r.POST("/playground/session", handlers.CreateSession)
	r.DELETE("/playground/session/:id", handlers.CloseSession)
	r.POST("/playground/session/:id/execute", handlers.ExecutePlaygroundQuery)

	r.GET("/health", handlers.Health)
}
