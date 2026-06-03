package handler

import (
	"database/sql"
	"net/http"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
)

func RegisterGitRoutes(r *gin.RouterGroup, db *sql.DB) {
	g := r.Group("/git")

	g.GET("/status", func(c *gin.Context) {
		out, err := runGit("status", "--short")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		files := strings.Split(strings.TrimSpace(out), "\n")
		if len(files) == 1 && files[0] == "" {
			files = nil
		}
		c.JSON(http.StatusOK, gin.H{"files": files, "output": out})
	})

	g.GET("/log", func(c *gin.Context) {
		out, err := runGit("log", "--oneline", "-20")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		entries := strings.Split(strings.TrimSpace(out), "\n")
		if len(entries) == 1 && entries[0] == "" {
			entries = nil
		}
		c.JSON(http.StatusOK, gin.H{"entries": entries})
	})

	g.GET("/diff", func(c *gin.Context) {
		out, err := runGit("diff")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"diff": out})
	})

	g.POST("/commit", func(c *gin.Context) {
		var req struct {
			Message string `json:"message"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		out, err := runGit("commit", "-m", req.Message)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": out + " " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"output": out})
	})

	g.POST("/add", func(c *gin.Context) {
		var req struct {
			Files []string `json:"files"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		args := append([]string{"add"}, req.Files...)
		out, err := runGit(args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": out + " " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"output": out})
	})

	g.POST("/add-all", func(c *gin.Context) {
		out, err := runGit("add", "-A")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": out + " " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"output": out})
	})
}

func runGit(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), err
	}
	return string(out), nil
}
