package service

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"
)

type ChapterService struct{ DB *sql.DB }

func (s *ChapterService) List(novelID string) ([]models.Chapter, error) {
	return repository.GetChapters(s.DB, novelID)
}

func (s *ChapterService) Get(id string) (*models.Chapter, error) {
	ch, err := repository.GetChapter(s.DB, id)
	if err != nil {
		return nil, fmt.Errorf("章节 %s 不存在", id)
	}
	return ch, nil
}

func (s *ChapterService) Create(req *models.ChapterCreateRequest) (*models.Chapter, error) {
	id := fmt.Sprintf("%04d", req.Number)
	// Check if already exists
	if _, err := repository.GetChapter(s.DB, id); err == nil {
		return nil, errors.New("该章节号已存在")
	}

	ch := &models.Chapter{
		ID:      id,
		NovelID: req.NovelID,
		Title:   req.Title,
		Content: req.Content,
		File:    fmt.Sprintf("%s.md", id),
	}
	if ch.NovelID == "" {
		ch.NovelID = "default"
	}
	ch.WordCount = countWords(ch.Content)

	if err := repository.CreateChapter(s.DB, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *ChapterService) Update(id string, req *models.ChapterUpdateRequest) (*models.Chapter, error) {
	ch, err := repository.GetChapter(s.DB, id)
	if err != nil {
		return nil, fmt.Errorf("章节 %s 不存在", id)
	}
	if req.Title != "" {
		ch.Title = req.Title
	}
	if req.Content != "" {
		ch.Content = req.Content
		ch.WordCount = countWords(req.Content)
	}
	if req.Status != "" {
		ch.Status = req.Status
	}
	if err := repository.UpdateChapter(s.DB, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *ChapterService) Delete(id string) error { return repository.DeleteChapter(s.DB, id) }

// SaveWithVersion AI 保存章节 + 自动创建版本
func (s *ChapterService) SaveWithVersion(req *models.ChapterSaveRequest, agentName string) error {
	chID := fmt.Sprintf("%04d", req.ChapterID)
	ch, err := repository.GetChapter(s.DB, chID)
	if err != nil {
		return fmt.Errorf("章节 %04d 不存在", req.ChapterID)
	}

	ch.Content = req.Content
	ch.WordCount = countWords(req.Content)
	ch.Status = "audit"
	if err := repository.UpdateChapter(s.DB, ch); err != nil {
		return err
	}

	// Create version
	now := time.Now().Format(time.RFC3339)
	version := &models.ChapterVersion{
		ID:          fmt.Sprintf("v-%d", time.Now().UnixMilli()),
		ChapterID:   chID,
		Content:     req.Content,
		Timestamp:   now,
		Source:      "agent",
		AgentName:   agentName,
		Description: req.Description,
	}
	return repository.CreateChapterVersion(s.DB, version)
}

func (s *ChapterService) GetVersions(chapterID string, limit int) ([]models.ChapterVersion, error) {
	return repository.GetChapterVersions(s.DB, chapterID, limit)
}

func (s *ChapterService) Rollback(chapterID string, versionID string) error {
	ver, err := repository.GetChapterVersion(s.DB, versionID)
	if err != nil {
		return fmt.Errorf("版本 %s 不存在", versionID)
	}

	ch, err := repository.GetChapter(s.DB, chapterID)
	if err != nil {
		return err
	}
	ch.Content = ver.Content
	ch.WordCount = countWords(ver.Content)
	if err := repository.UpdateChapter(s.DB, ch); err != nil {
		return err
	}

	// Create rollback version record
	now := time.Now().Format(time.RFC3339)
	rollback := &models.ChapterVersion{
		ID:          fmt.Sprintf("v-%d", time.Now().UnixMilli()),
		ChapterID:   chapterID,
		Content:     ch.Content,
		Timestamp:   now,
		Source:      "rollback",
		Description: fmt.Sprintf("回滚自 %s", versionID),
	}
	return repository.CreateChapterVersion(s.DB, rollback)
}

func (s *ChapterService) Search(novelID string, query string) ([]models.Chapter, error) {
	return repository.SearchChapters(s.DB, novelID, query)
}

func (s *ChapterService) Stats(novelID string) (map[string]interface{}, error) {
	totalChapters, totalWords, recentChapters, err := repository.GetChapterStats(s.DB, novelID)
	if err != nil {
		return nil, err
	}
	// Count characters
	var charCount int
	s.DB.QueryRow(`SELECT COUNT(*) FROM characters WHERE novel_id=?`, novelID).Scan(&charCount)
	// Count foreshadowing
	var fsCount int
	s.DB.QueryRow(`SELECT COUNT(*) FROM foreshadowing WHERE novel_id=?`, novelID).Scan(&fsCount)

	return map[string]interface{}{
		"totalChapters":  totalChapters,
		"totalWords":     totalWords,
		"characterCount": charCount,
		"hookCount":      fsCount,
		"recentChapters": recentChapters,
	}, nil
}

func countWords(text string) int {
	n := 0
	for _, r := range text {
		if r > ' ' {
			n++
		}
	}
	return n
}
