package routes

import (
	"github.com/Sahil-796/seeql/apps/api/handlers"
	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	r.POST("/infer", handlers.InferSchema)
	r.POST("/generate", handlers.GenerateData)
	r.GET("/health", handlers.Health)
}
