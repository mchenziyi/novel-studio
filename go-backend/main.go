package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"novel-studio-go/internal/config"
	"novel-studio-go/internal/database"
	"novel-studio-go/internal/router"

	"github.com/gin-gonic/gin"
)

//go:embed web/dist
var staticFiles embed.FS

func main() {
	cfg := config.Load()

	if err := database.Init(cfg.DBPath); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	defer database.Close()

	r := router.Setup(database.DB)

	// Serve Vue SPA
	distFS, err := fs.Sub(staticFiles, "web/dist")
	if err != nil {
		log.Fatalf("Failed to embed frontend: %v", err)
	}
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method == "GET" && c.Request.URL.Path != "" {
			f, err := distFS.Open(c.Request.URL.Path[1:])
			if err == nil {
				defer f.Close()
				http.FileServer(http.FS(distFS)).ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		// SPA fallback: serve index.html
		c.FileFromFS("/", http.FS(distFS))
	})

	log.Printf("Novel Studio starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
