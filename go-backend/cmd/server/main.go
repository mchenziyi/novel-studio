package main

import (
	"log"

	"novel-studio-go/internal/config"
	"novel-studio-go/internal/database"
	"novel-studio-go/internal/router"
)

func main() {
	cfg := config.Load()

	if err := database.Init(cfg.DBPath); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	defer database.Close()

	r := router.Setup(database.DB)

	log.Printf("Novel Studio Go backend starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
