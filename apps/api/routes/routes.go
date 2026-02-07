package routes

import (
	"github.com/Sahil-796/seeql/apps/api/handlers"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	// Schema and data generation (individual steps)
	r.POST("/infer", handlers.InferSchema)
	r.POST("/generate", handlers.GenerateData)

	// Full execution pipeline (parse → schema → generate → execute)
	r.POST("/quick-run", handlers.QuickRun)
	r.POST("/execute", handlers.QuickRun) // Alias for /quick-run

	// Health check
	r.GET("/health", handlers.Health)
}
