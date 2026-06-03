package handler

import (
	"database/sql"
	"net/http"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/service"

	"github.com/gin-gonic/gin"
)

type ChapterHandler struct {
	Svc *service.ChapterService
}

func NewChapterHandler(db *sql.DB) *ChapterHandler {
	return &ChapterHandler{Svc: &service.ChapterService{DB: db}}
}

// GET /api/chapters
func (h *ChapterHandler) List(c *gin.Context) {
	novelID := c.DefaultQuery("novelId", "default")
	chapters, err := h.Svc.List(novelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if chapters == nil {
		chapters = []models.Chapter{}
	}
	c.JSON(http.StatusOK, chapters)
}

// GET /api/chapters/:id
func (h *ChapterHandler) Get(c *gin.Context) {
	ch, err := h.Svc.Get(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ch)
}

// POST /api/chapters/create
func (h *ChapterHandler) Create(c *gin.Context) {
	var req models.ChapterCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.NovelID == "" {
		req.NovelID = "default"
	}
	ch, err := h.Svc.Create(&req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ch)
}

// PUT /api/chapters/:id
func (h *ChapterHandler) Update(c *gin.Context) {
	var req models.ChapterUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ch, err := h.Svc.Update(c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ch)
}

// DELETE /api/chapters/:id
func (h *ChapterHandler) Delete(c *gin.Context) {
	if err := h.Svc.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /api/chapters/:id/history
func (h *ChapterHandler) History(c *gin.Context) {
	vers, err := h.Svc.GetVersions(c.Param("id"), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if vers == nil {
		vers = []models.ChapterVersion{}
	}
	c.JSON(http.StatusOK, vers)
}

// POST /api/chapters/:id/rollback
func (h *ChapterHandler) Rollback(c *gin.Context) {
	var req models.VersionRollbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Svc.Rollback(c.Param("id"), req.VersionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Return updated chapter
	ch, _ := h.Svc.Get(c.Param("id"))
	c.JSON(http.StatusOK, ch)
}

// GET /api/chapters/:id/diff
func (h *ChapterHandler) Diff(c *gin.Context) {
	v1 := c.Query("from")
	v2 := c.Query("to")
	// Simple diff: return both versions
	ver1, err := h.Svc.GetVersions(c.Param("id"), 100)
	if err != nil || len(ver1) < 2 {
		c.JSON(http.StatusOK, gin.H{"diff": "需要至少两个版本"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"from":    v1,
		"to":      v2,
		"current": ver1[0].Content,
	})
}
