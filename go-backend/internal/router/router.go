package router

import (
	"database/sql"

	"novel-studio-go/internal/handler"
	"novel-studio-go/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(db *sql.DB) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())
	r.Use(gin.Recovery())

	api := r.Group("/api")

	// Chapters
	ch := handler.NewChapterHandler(db)
	api.GET("/chapters", ch.List)
	api.POST("/chapters/create", ch.Create)
	api.GET("/chapters/:id", ch.Get)
	api.PUT("/chapters/:id", ch.Update)
	api.DELETE("/chapters/:id", ch.Delete)
	api.GET("/chapters/:id/history", ch.History)
	api.GET("/chapters/:id/diff", ch.Diff)
	api.POST("/chapters/:id/rollback", ch.Rollback)

	// Agent Chat
	chat := handler.NewChatHandler(db)
	api.GET("/agent/chat", chat.List)
	api.POST("/agent/chat", chat.SSEChat)
	api.DELETE("/agent/chat/:id", chat.Delete)
	api.POST("/agent/chat/:id/restore", chat.Restore)

	// Characters, Foreshadowing, Outline, Novels, Models, Style, Plotlines, Search
	handler.RegisterCharacterRoutes(api, db)
	handler.RegisterForeshadowingRoutes(api, db)
	handler.RegisterOutlineRoutes(api, db)
	handler.RegisterNovelRoutes(api, db)
	handler.RegisterModelRoutes(api, db)
	handler.RegisterStyleRoutes(api, db)
	handler.RegisterPlotlineRoutes(api, db)
	handler.RegisterSearchRoutes(api, db)
	handler.RegisterStatsRoutes(api, db)
	handler.RegisterMigrationRoutes(api, db)

	// New: Git, Settings, Files, Models advanced
	handler.RegisterGitRoutes(api, db)
	handler.RegisterSettingsRoutes(api, db)
	handler.RegisterFilesRoutes(api, db)
	handler.RegisterModelsExtRoutes(api, db)

	return r
}
