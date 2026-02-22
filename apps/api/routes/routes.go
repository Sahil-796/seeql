package routes

import (
	"os"
	"time"

	"github.com/Sahil-796/seeql/apps/api/handlers"
	"github.com/Sahil-796/seeql/apps/api/middleware"
	"github.com/Sahil-796/seeql/internal/db"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func Setup(r *gin.Engine) {
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data/sessions"
	}
	handlers.SessionManager = db.NewSessionManager(dataDir)

	go handlers.SessionManager.CleanupOrphanedDBs()
	handlers.SessionManager.StartCleanup()

	r.POST("/quick-run", middleware.RateLimitMiddleware(rate.Every(12*time.Second), 2), handlers.QuickRun)
	r.POST("/generate", middleware.RateLimitMiddleware(rate.Every(6*time.Second), 3), handlers.GenerateData)

	r.POST("/playground/session", middleware.RateLimitMiddleware(rate.Every(2*time.Second), 5), handlers.CreateSession)
	r.DELETE("/playground/session/:id", middleware.RateLimitMiddleware(rate.Every(2*time.Second), 5), handlers.CloseSession)

	r.POST("/playground/session/:id/execute", middleware.RateLimitMiddleware(rate.Every(6*time.Second), 3), handlers.ExecutePlaygroundQuery)
	r.GET("/playground/session/:id", middleware.RateLimitMiddleware(rate.Every(2*time.Second), 5), handlers.GetSession)
	r.GET("/playground/session/:id/schema", middleware.RateLimitMiddleware(rate.Every(2*time.Second), 5), handlers.GetSessionSchema)

	r.GET("/health", handlers.Health)
}
