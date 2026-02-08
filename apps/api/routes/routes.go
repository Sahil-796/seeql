package routes

import (
	"os"

	"github.com/Sahil-796/seeql/apps/api/handlers"
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	// Schema and data generation (individual steps)
	r.POST("/infer", handlers.InferSchema)
	r.POST("/generate", handlers.GenerateData)

	// Full execution pipeline (parse → schema → generate → execute)
	r.POST("/quick-run", handlers.QuickRun)
	r.POST("/execute", handlers.QuickRun) // Alias for /quick-run
	
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data/sessions"
	}
	sm := db.NewSessionManager(dataDir)
	
	handlers.SessionManager = sm
	
	r.POST("/playground/session", handlers.CreateSession)
	r.DELETE("/playground/session/:id", handlers.CloseSession)
	
	// Health check
	r.GET("/health", handlers.Health)
}
