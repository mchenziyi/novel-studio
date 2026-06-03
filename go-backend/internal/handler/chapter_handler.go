package handler

import (
	"database/sql"
	"net/http"
	"strings"

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
	fromVer := c.Query("from")
	toVer := c.Query("to")

	ch, err := h.Svc.Get(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "章节不存在"})
		return
	}

	var leftContent string
	if fromVer == "" || fromVer == "current" {
		leftContent = ch.Content
	} else {
		ver, err := h.Svc.GetVersion(fromVer)
		if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "版本不存在"}); return }
		leftContent = ver.Content
	}

	var rightContent string
	if toVer == "" || toVer == "current" {
		rightContent = ch.Content
	} else {
		ver, err := h.Svc.GetVersion(toVer)
		if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "版本不存在"}); return }
		rightContent = ver.Content
	}

	leftLines := strings.Split(leftContent, "\n")
	rightLines := strings.Split(rightContent, "\n")
	diffBlocks := computeLineDiffWithCharDiffs(leftLines, rightLines)

	c.JSON(http.StatusOK, gin.H{
		"left":  leftContent, "right": rightContent, "diff": diffBlocks,
	})
}
// computeLineDiffWithCharDiffs: line-level LCS + character-level diffs within modified blocks.
func computeLineDiffWithCharDiffs(a, b []string) []map[string]interface{} {
	m, n := len(a), len(b)
	dp := make([][]int, m+1)
	for i := range dp { dp[i] = make([]int, n+1) }
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else if dp[i-1][j] > dp[i][j-1] {
				dp[i][j] = dp[i-1][j]
			} else {
				dp[i][j] = dp[i][j-1]
			}
		}
	}

	type op struct{ kind byte; li, ri int }
	var ops []op
	i, j := m, n
	for i > 0 || j > 0 {
		if i > 0 && j > 0 && a[i-1] == b[j-1] { ops = append(ops, op{'e', i-1, j-1}); i--; j-- } else if j > 0 && (i == 0 || dp[i][j-1] >= dp[i-1][j]) { ops = append(ops, op{'i', -1, j-1}); j-- } else { ops = append(ops, op{'d', i-1, -1}); i-- }
	}
	for x, y := 0, len(ops)-1; x < y; x, y = x+1, y-1 { ops[x], ops[y] = ops[y], ops[x] }

	// Merge into blocks
	var blocks []map[string]interface{}
	for _, o := range ops {
		kind := "equal"; switch o.kind { case 'd': kind = "delete"; case 'i': kind = "insert" }
		if len(blocks) > 0 && blocks[len(blocks)-1]["type"] == kind {
			b := blocks[len(blocks)-1]
			lr, rr := b["leftLines"].([]int), b["rightLines"].([]int)
			if o.li >= 0 { lr[1] = o.li }
			if o.ri >= 0 { rr[1] = o.ri }
		} else {
			blocks = append(blocks, map[string]interface{}{"type": kind, "leftLines": []int{o.li, o.li}, "rightLines": []int{o.ri, o.ri}})
		}
	}

	// Add character-level diffs for adjacent delete+insert pairs (modifications)
	for i := 0; i < len(blocks)-1; i++ {
		b1, b2 := blocks[i], blocks[i+1]
		if b1["type"] == "delete" && b2["type"] == "insert" {
			lr, rr := b1["leftLines"].([]int), b2["rightLines"].([]int)
			chars := computeCharDiffs(a[lr[0]:lr[1]+1], b[rr[0]:rr[1]+1])
			b1["charDiffs"] = chars
		}
	}
	if len(blocks) == 0 { blocks = []map[string]interface{}{} }
	return blocks
}

// computeCharDiffs: for each pair of old/new lines, find common prefix/suffix
func computeCharDiffs(oldLines, newLines []string) []map[string]interface{} {
	var diffs []map[string]interface{}
	maxPairs := len(oldLines)
	if len(newLines) < maxPairs { maxPairs = len(newLines) }
	for i := 0; i < maxPairs; i++ {
		oldRunes := []rune(oldLines[i])
		newRunes := []rune(newLines[i])
		prefix := 0
		for prefix < len(oldRunes) && prefix < len(newRunes) && oldRunes[prefix] == newRunes[prefix] { prefix++ }
		suffix := 0
		for suffix < len(oldRunes)-prefix && suffix < len(newRunes)-prefix && oldRunes[len(oldRunes)-1-suffix] == newRunes[len(newRunes)-1-suffix] { suffix++ }
		diffs = append(diffs, map[string]interface{}{
			"oldLine":   i, "newLine": i, "prefixLen": prefix, "suffixLen": suffix,
			"oldLen":    len(oldRunes), "newLen": len(newRunes),
		})
	}
	return diffs
}
