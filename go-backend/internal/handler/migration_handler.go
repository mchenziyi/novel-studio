package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"

	"github.com/gin-gonic/gin"
)

func RegisterMigrationRoutes(r *gin.RouterGroup, db *sql.DB) {
	m := r.Group("/migration")
	m.POST("/all", func(c *gin.Context) {
		var req models.MigrationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		sourcePath := req.SourcePath
		if sourcePath == "" {
			sourcePath = "../.data"
		}

		result := map[string]int{}
		// 1. Copy SQLite DB
		if _, err := os.Stat(filepath.Join(sourcePath, "novel-studio.db")); err == nil {
			result["db"] = migrateDB(db, sourcePath)
		}
		// 2. Import markdown chapters
		if chCount := migrateMarkdownChapters(db, sourcePath, req.NovelID); chCount > 0 {
			result["chapters"] = chCount
		}
		c.JSON(http.StatusOK, gin.H{"migrated": result})
	})

	m.POST("/characters", func(c *gin.Context) {
		var req models.MigrationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		sourcePath := req.SourcePath
		if sourcePath == "" {
			sourcePath = "../.data"
		}
		count := migrateCharactersFile(db, sourcePath, req.NovelID)
		c.JSON(http.StatusOK, gin.H{"migrated": count})
	})

	m.POST("/foreshadowing", func(c *gin.Context) {
		var req models.MigrationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		sourcePath := req.SourcePath
		if sourcePath == "" {
			sourcePath = "../.data"
		}
		count := migrateForeshadowingFile(db, sourcePath, req.NovelID)
		c.JSON(http.StatusOK, gin.H{"migrated": count})
	})

	m.POST("/story", func(c *gin.Context) {
		var req models.MigrationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		sourcePath := req.SourcePath
		if sourcePath == "" {
			sourcePath = "../.data"
		}
		count := migrateStoryData(db, sourcePath, req.NovelID)
		c.JSON(http.StatusOK, gin.H{"migrated": count})
	})
}

func migrateDB(db *sql.DB, sourcePath string) int {
	srcDBPath := filepath.Join(sourcePath, "novel-studio.db")
	src, err := os.Open(srcDBPath)
	if err != nil {
		return 0
	}
	defer src.Close()

	count := 0
	// Read chapters from source DB
	srcDB, err := sql.Open("sqlite", srcDBPath+"?mode=ro")
	if err != nil {
		return 0
	}
	defer srcDB.Close()

	// Copy chapters
	rows, err := srcDB.Query(`SELECT id, novel_id, title, content, word_count, file, status, last_modified FROM chapters`)
	if err == nil {
		defer rows.Close()
		var chapters []models.Chapter
		for rows.Next() {
			var ch models.Chapter
			var lastMod sql.NullString
			if err := rows.Scan(&ch.ID, &ch.NovelID, &ch.Title, &ch.Content, &ch.WordCount, &ch.File, &ch.Status, &lastMod); err != nil {
				continue
			}
			ch.LastModified = lastMod.String
			if ch.NovelID == "" {
				ch.NovelID = "default"
			}
			chapters = append(chapters, ch)
		}
		if err := repository.BulkInsertChapters(db, chapters); err == nil {
			count += len(chapters)
		}
	}

	// Copy characters
	rows2, err := srcDB.Query(`SELECT id, novel_id, name, role, status, description, first_appearance, last_appearance FROM characters`)
	if err == nil {
		defer rows2.Close()
		var chars []models.Character
		for rows2.Next() {
			var c models.Character
			var desc, status sql.NullString
			var fa, la sql.NullInt64
			if err := rows2.Scan(&c.ID, &c.NovelID, &c.Name, &c.Role, &status, &desc, &fa, &la); err != nil {
				continue
			}
			c.Description = desc.String
			c.Status = status.String
			c.FirstAppearance = int(fa.Int64)
			c.LastAppearance = int(la.Int64)
			if c.NovelID == "" {
				c.NovelID = "default"
			}
			chars = append(chars, c)
		}
		repository.BulkInsertCharacters(db, chars)
	}

	// Copy foreshadowing
	rows3, err := srcDB.Query(`SELECT id, novel_id, name, description, status, planted_chapter, resolved_chapter FROM foreshadowing`)
	if err == nil {
		defer rows3.Close()
		var items []models.Foreshadowing
		for rows3.Next() {
			var f models.Foreshadowing
			var desc sql.NullString
			var pc, rc sql.NullInt64
			if err := rows3.Scan(&f.ID, &f.NovelID, &f.Name, &desc, &f.Status, &pc, &rc); err != nil {
				continue
			}
			f.Description = desc.String
			f.PlantedChapter = int(pc.Int64)
			f.ResolvedChapter = int(rc.Int64)
			if f.NovelID == "" {
				f.NovelID = "default"
			}
			items = append(items, f)
		}
		repository.BulkInsertForeshadowings(db, items)
	}

	return count
}

func migrateMarkdownChapters(db *sql.DB, sourcePath string, novelID string) int {
	if novelID == "" {
		novelID = "default"
	}
	chaptersDir := filepath.Join(sourcePath, "chapters")
	entries, err := os.ReadDir(chaptersDir)
	if err != nil {
		return 0
	}

	count := 0
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}
		id := strings.TrimSuffix(entry.Name(), ".md")
		content, err := os.ReadFile(filepath.Join(chaptersDir, entry.Name()))
		if err != nil {
			continue
		}

		// Extract title from first line
		text := string(content)
		title := id
		if idx := strings.Index(text, "\n"); idx > 0 {
			firstLine := strings.TrimPrefix(strings.TrimSpace(text[:idx]), "# ")
			if firstLine != "" {
				title = firstLine
			}
		}

		ch := &models.Chapter{
			ID:       id,
			NovelID:  novelID,
			Title:    title,
			Content:  text,
			File:     entry.Name(),
			Status:   "synced",
		}
		ch.WordCount = len([]rune(text))
		if err := repository.CreateChapter(db, ch); err == nil {
			count++
		}
	}
	return count
}

func migrateCharactersFile(db *sql.DB, sourcePath string, novelID string) int {
	if novelID == "" {
		novelID = "default"
	}
	charPath := filepath.Join(sourcePath, "characters.json")
	data, err := os.ReadFile(charPath)
	if err != nil {
		return 0
	}
	var chars []models.Character
	if err := json.Unmarshal(data, &chars); err != nil {
		return 0
	}
	for i := range chars {
		chars[i].NovelID = novelID
	}
	if err := repository.BulkInsertCharacters(db, chars); err != nil {
		return 0
	}
	return len(chars)
}

func migrateForeshadowingFile(db *sql.DB, sourcePath string, novelID string) int {
	if novelID == "" {
		novelID = "default"
	}
	path := filepath.Join(sourcePath, "foreshadowing.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	var items []models.Foreshadowing
	if err := json.Unmarshal(data, &items); err != nil {
		return 0
	}
	for i := range items {
		items[i].NovelID = novelID
	}
	if err := repository.BulkInsertForeshadowings(db, items); err != nil {
		return 0
	}
	return len(items)
}

func migrateStoryData(db *sql.DB, sourcePath string, novelID string) int {
	if novelID == "" {
		novelID = "default"
	}
	count := 0
	// Try to find and import various JSON files
	patterns := map[string]string{
		"facts":     "story_facts",
		"hooks":     "story_hooks",
		"summaries": "story_summaries",
	}
	for file, table := range patterns {
		path := filepath.Join(sourcePath, file+".json")
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		// Generic import as key-value rows
		var records []map[string]interface{}
		if err := json.Unmarshal(data, &records); err != nil {
			continue
		}
		for _, rec := range records {
			b, _ := json.Marshal(rec)
			switch table {
			case "story_facts":
				db.Exec(`INSERT OR IGNORE INTO story_facts (id, novel_id, chapter, category, subject, content) VALUES (?,?,?,?,?,?)`,
					rec["id"], novelID, rec["chapter"], rec["category"], rec["subject"], string(b))
			}
			count++
		}
	}
	return count
}

func init() {} // prevent unused import error
