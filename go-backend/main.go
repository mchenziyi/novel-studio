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
	fileServer := http.FileServer(http.FS(distFS))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// Serve static assets via file server
		if path != "/" && path != "/index.html" {
			f, err := distFS.Open(path[1:])
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		// SPA fallback: read and serve index.html content directly
		data, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			c.Status(404)
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})

	log.Printf("Novel Studio starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
