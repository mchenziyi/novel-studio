package service

import (
	"database/sql"
	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"
)

type ForeshadowingService struct{ DB *sql.DB }

func (s *ForeshadowingService) List(novelID string, status string) ([]models.Foreshadowing, error) {
	return repository.GetForeshadowings(s.DB, novelID, status)
}

func (s *ForeshadowingService) Create(f *models.Foreshadowing) error {
	return repository.CreateForeshadowing(s.DB, f)
}

func (s *ForeshadowingService) Update(f *models.Foreshadowing) error {
	return repository.UpdateForeshadowing(s.DB, f)
}

type OutlineService struct{ DB *sql.DB }

func (s *OutlineService) Get(novelID string) (*models.Outline, error) {
	return repository.GetOutline(s.DB, novelID)
}

func (s *OutlineService) Save(o *models.Outline) error {
	return repository.UpsertOutline(s.DB, o)
}

type ChatService struct{ DB *sql.DB }

func (s *ChatService) CreateSession(sess *models.ChatSession) error {
	return repository.CreateChatSession(s.DB, sess)
}

func (s *ChatService) GetSession(id string) (*models.ChatSession, error) {
	return repository.GetChatSession(s.DB, id)
}

func (s *ChatService) ListSessions(novelID string) ([]models.ChatSession, error) {
	return repository.GetChatSessions(s.DB, novelID)
}

func (s *ChatService) UpdateTitle(id string, title string) error {
	return repository.UpdateChatSessionTitle(s.DB, id, title)
}

func (s *ChatService) SoftDelete(id string) error {
	return repository.SoftDeleteChatSession(s.DB, id)
}

func (s *ChatService) Restore(id string) error {
	return repository.RestoreChatSession(s.DB, id)
}

func (s *ChatService) AddMessage(m *models.ChatMessage) error {
	return repository.AddChatMessage(s.DB, m)
}

func (s *ChatService) GetMessages(sessionID string) ([]models.ChatMessage, error) {
	return repository.GetChatMessages(s.DB, sessionID)
}

type MemoryService struct{ DB *sql.DB }

func (s *MemoryService) Save(m *models.Memory) error {
	return repository.CreateMemory(s.DB, m)
}

func (s *MemoryService) Search(novelID string, query string, category string) ([]models.Memory, error) {
	return repository.SearchMemories(s.DB, novelID, query, category)
}

func (s *MemoryService) List(novelID string, category string) ([]models.Memory, error) {
	return repository.ListMemories(s.DB, novelID, category)
}

func (s *MemoryService) Get(id string) (*models.Memory, error) {
	return repository.GetMemory(s.DB, id)
}

func (s *MemoryService) IncrementUse(id string) error {
	return repository.IncrementMemoryUseCount(s.DB, id)
}

type StyleService struct{ DB *sql.DB }

func (s *StyleService) List(novelID string) ([]models.StyleProfile, error) {
	return repository.GetStyleProfiles(s.DB, novelID)
}

func (s *StyleService) GetActive(novelID string) (*models.StyleProfile, error) {
	return repository.GetActiveStyleProfile(s.DB, novelID)
}

func (s *StyleService) Create(sp *models.StyleProfile) error {
	return repository.CreateStyleProfile(s.DB, sp)
}

func (s *StyleService) Activate(sp *models.StyleProfile) error {
	if err := repository.DeactivateStyleProfiles(s.DB, sp.NovelID); err != nil {
		return err
	}
	return repository.ActivateStyleProfile(s.DB, sp.ID)
}

func (s *StyleService) Delete(id int) error {
	return repository.DeleteStyleProfile(s.DB, id)
}

type ModelService struct{ DB *sql.DB }

func (s *ModelService) List() ([]models.ModelConfig, error) {
	return repository.GetModelConfigs(s.DB)
}

func (s *ModelService) Create(mc *models.ModelConfig) error {
	return repository.CreateModelConfig(s.DB, mc)
}

func (s *ModelService) Update(mc *models.ModelConfig) error {
	return repository.UpdateModelConfig(s.DB, mc)
}

func (s *ModelService) Delete(id string) error {
	return repository.DeleteModelConfig(s.DB, id)
}

type NovelService struct{ DB *sql.DB }

func (s *NovelService) List() ([]models.Novel, error) {
	return repository.GetAllNovels(s.DB)
}

func (s *NovelService) Get(id string) (*models.Novel, error) {
	return repository.GetNovel(s.DB, id)
}

func (s *NovelService) Create(n *models.Novel) error {
	return repository.CreateNovel(s.DB, n)
}

func (s *NovelService) Update(n *models.Novel) error {
	return repository.UpdateNovel(s.DB, n)
}

func (s *NovelService) GetConfigs(novelID string) (map[string]string, error) {
	return repository.GetNovelConfigs(s.DB, novelID)
}

func (s *NovelService) SetConfig(novelID string, key string, value string) error {
	return repository.SetNovelConfig(s.DB, novelID, key, value)
}

type StoryService struct{ DB *sql.DB }

func (s *StoryService) GetFacts(novelID string, chapter int) ([]models.StoryFact, error) {
	return repository.GetStoryFacts(s.DB, novelID, chapter)
}

func (s *StoryService) AddFact(f *models.StoryFact) error {
	return repository.AddStoryFact(s.DB, f)
}

func (s *StoryService) GetHooks(novelID string, status string) ([]models.StoryHook, error) {
	return repository.GetStoryHooks(s.DB, novelID, status)
}

func (s *StoryService) AddHook(h *models.StoryHook) error {
	return repository.AddStoryHook(s.DB, h)
}

func (s *StoryService) UpdateHook(h *models.StoryHook) error {
	return repository.UpdateStoryHook(s.DB, h)
}

func (s *StoryService) GetSummaries(novelID string) ([]models.StorySummary, error) {
	return repository.GetStorySummaries(s.DB, novelID)
}

func (s *StoryService) UpsertSummary(sum *models.StorySummary) error {
	return repository.UpsertStorySummary(s.DB, sum)
}

func (s *StoryService) GetState(novelID string) ([]models.StoryState, error) {
	return repository.GetStoryState(s.DB, novelID)
}

func (s *StoryService) SetState(novelID string, category string, key string, value string) error {
	return repository.SetStoryState(s.DB, novelID, category, key, value)
}

func (s *StoryService) GetCharacters(novelID string) ([]models.StoryCharacter, error) {
	return repository.GetStoryCharacters(s.DB, novelID)
}

func (s *StoryService) UpsertCharacter(sc *models.StoryCharacter) error {
	return repository.UpsertStoryCharacter(s.DB, sc)
}

func (s *StoryService) GetPlotlines(novelID string) ([]models.StoryPlotline, error) {
	return repository.GetStoryPlotlines(s.DB, novelID)
}

func (s *StoryService) UpsertPlotline(p *models.StoryPlotline) error {
	return repository.UpsertStoryPlotline(s.DB, p)
}

func (s *StoryService) GetResources(novelID string) ([]models.StoryResource, error) {
	return repository.GetStoryResources(s.DB, novelID)
}

func (s *StoryService) AddResource(r *models.StoryResource) error {
	return repository.AddStoryResource(s.DB, r)
}

func (s *StoryService) GetSync(novelID string) (*models.StorySync, error) {
	return repository.GetStorySync(s.DB, novelID)
}

func (s *StoryService) UpsertSync(sync *models.StorySync) error {
	return repository.UpsertStorySync(s.DB, sync)
}
