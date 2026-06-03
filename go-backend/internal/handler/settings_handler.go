package handler

import (
	"database/sql"
	"net/http"

	"novel-studio-go/internal/repository"

	"github.com/gin-gonic/gin"
)

func RegisterSettingsRoutes(r *gin.RouterGroup, db *sql.DB) {
	r.GET("/settings", func(c *gin.Context) {
		// Return all settings as key-value pairs
		rows, err := db.Query("SELECT key, value FROM settings")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		settings := make(map[string]string)
		for rows.Next() {
			var k, v string
			if err := rows.Scan(&k, &v); err != nil {
				continue
			}
			settings[k] = v
		}
		c.JSON(http.StatusOK, settings)
	})

	r.PUT("/settings", func(c *gin.Context) {
		var req map[string]string
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		for k, v := range req {
			if err := repository.SetSetting(db, k, v); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}

func RegisterFilesRoutes(r *gin.RouterGroup, db *sql.DB) {
	r.GET("/files", func(c *gin.Context) {
		novelID := c.DefaultQuery("novelId", "default")
		// Return chapter files list from database
		rows, err := db.Query("SELECT id, title, file FROM chapters WHERE novel_id=? ORDER BY id", novelID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var files []map[string]string
		for rows.Next() {
			var id, title, file string
			if err := rows.Scan(&id, &title, &file); err != nil {
				continue
			}
			files = append(files, map[string]string{"id": id, "title": title, "file": file})
		}
		if files == nil {
			files = []map[string]string{}
		}
		c.JSON(http.StatusOK, gin.H{"files": files})
	})
}
