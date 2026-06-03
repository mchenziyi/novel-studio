package models

// Novel 小说
type Novel struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Author      string `json:"author,omitempty"`
	CoverImage  string `json:"coverImage,omitempty"`
	ProjectPath string `json:"projectPath,omitempty"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// Chapter 章节
type Chapter struct {
	ID           string `json:"id"`
	NovelID      string `json:"novelId"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	WordCount    int    `json:"wordCount"`
	File         string `json:"file"`
	Status       string `json:"status"`
	LastModified string `json:"lastModified,omitempty"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// ChapterVersion 章节版本
type ChapterVersion struct {
	ID            string `json:"id"`
	ChapterID     string `json:"chapterId"`
	Content       string `json:"content"`
	Timestamp     string `json:"timestamp"`
	Source        string `json:"source"`
	AgentName     string `json:"agentName,omitempty"`
	Description   string `json:"description,omitempty"`
	GitCommitHash string `json:"gitCommitHash,omitempty"`
	CreatedAt     string `json:"createdAt"`
}

// Character 角色
type Character struct {
	ID              string `json:"id"`
	NovelID         string `json:"novelId"`
	Name            string `json:"name"`
	Role            string `json:"role"`
	Status          string `json:"status,omitempty"`
	Description     string `json:"description,omitempty"`
	FirstAppearance int    `json:"firstAppearance,omitempty"`
	LastAppearance  int    `json:"lastAppearance,omitempty"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

// CharacterRelation 角色关系
type CharacterRelation struct {
	ID          int     `json:"id"`
	SourceID    string  `json:"sourceId"`
	TargetID    string  `json:"targetId"`
	Type        string  `json:"type"`
	Strength    float64 `json:"strength"`
	Description string  `json:"description,omitempty"`
	CreatedAt   string  `json:"createdAt"`
}

// Foreshadowing 伏笔
type Foreshadowing struct {
	ID              string `json:"id"`
	NovelID         string `json:"novelId"`
	Name            string `json:"name"`
	Description     string `json:"description,omitempty"`
	Status          string `json:"status"`
	PlantedChapter  int    `json:"plantedChapter,omitempty"`
	ResolvedChapter int    `json:"resolvedChapter,omitempty"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

// Outline 大纲
type Outline struct {
	ID        string `json:"id"`
	NovelID   string `json:"novelId"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updatedAt"`
}

// ModelConfig 模型配置
type ModelConfig struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	Enabled   bool   `json:"enabled"`
	IsDefault bool   `json:"isDefault"`
	Settings  string `json:"settings"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// Setting 系统设置
type Setting struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	UpdatedAt string `json:"updatedAt"`
}

// ChatSession 聊天会话
type ChatSession struct {
	ID        string `json:"id"`
	NovelID   string `json:"novelId"`
	Title     string `json:"title"`
	ChapterID string `json:"chapterId,omitempty"`
	Context   string `json:"context"`
	Model     string `json:"model,omitempty"`
	DeletedAt string `json:"deletedAt,omitempty"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

// ChatMessage 聊天消息
type ChatMessage struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionId"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	Metadata  string `json:"metadata,omitempty"`
	CreatedAt string `json:"createdAt"`
}

// Memory AI 记忆
type Memory struct {
	ID         string `json:"id"`
	NovelID    string `json:"novelId"`
	Category   string `json:"category"`
	Key        string `json:"key"`
	Content    string `json:"content"`
	Source     string `json:"source,omitempty"`
	Importance int    `json:"importance"`
	UseCount   int    `json:"useCount"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

// StoryFact 故事事实
type StoryFact struct {
	ID        string `json:"id"`
	NovelID   string `json:"novelId"`
	Chapter   int    `json:"chapter"`
	Category  string `json:"category"`
	Subject   string `json:"subject"`
	Content   string `json:"content"`
	Sources   string `json:"sources,omitempty"`
	CreatedAt string `json:"createdAt"`
}

// StoryHook 故事钩子
type StoryHook struct {
	ID        string `json:"id"`
	NovelID   string `json:"novelId"`
	Chapter   int    `json:"chapter,omitempty"`
	Type      string `json:"type"`
	Content   string `json:"content"`
	FactIDs   string `json:"factIds,omitempty"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}

// StorySummary 章节摘要
type StorySummary struct {
	ID        int    `json:"id"`
	NovelID   string `json:"novelId"`
	Chapter   int    `json:"chapter"`
	Title     string `json:"title,omitempty"`
	Summary   string `json:"summary,omitempty"`
	KeyEvents string `json:"keyEvents,omitempty"`
	FactRange string `json:"factRange,omitempty"`
	UpdatedAt string `json:"updatedAt"`
}

// StoryState 故事状态
type StoryState struct {
	ID        int    `json:"id"`
	NovelID   string `json:"novelId"`
	Category  string `json:"category,omitempty"`
	Key       string `json:"key"`
	Value     string `json:"value,omitempty"`
	UpdatedAt string `json:"updatedAt"`
}

// StoryCharacter 故事角色（Detectivel）
type StoryCharacter struct {
	ID            int    `json:"id"`
	NovelID       string `json:"novelId"`
	Name          string `json:"name"`
	Role          string `json:"role,omitempty"`
	Status        string `json:"status,omitempty"`
	Personality   string `json:"personality,omitempty"`
	SpeakingStyle string `json:"speakingStyle,omitempty"`
	CurrentState  string `json:"currentState,omitempty"`
	Relations     string `json:"relations,omitempty"`
	UpdatedAt     string `json:"updatedAt"`
}

// StoryResource 故事资源
type StoryResource struct {
	ID           int    `json:"id"`
	NovelID      string `json:"novelId"`
	Chapter      int    `json:"chapter,omitempty"`
	ResourceName string `json:"resourceName"`
	ChangeType   string `json:"changeType,omitempty"`
	Amount       string `json:"amount,omitempty"`
	Description  string `json:"description,omitempty"`
	FactID       string `json:"factId,omitempty"`
	UpdatedAt    string `json:"updatedAt"`
}

// StoryPlotline 情节线
type StoryPlotline struct {
	ID           string `json:"id"`
	NovelID      string `json:"novelId"`
	Name         string `json:"name"`
	Status       string `json:"status"`
	StartChapter int    `json:"startChapter,omitempty"`
	EndChapter   int    `json:"endChapter,omitempty"`
	Description  string `json:"description,omitempty"`
	UpdatedAt    string `json:"updatedAt"`
}

// StorySync 同步状态
type StorySync struct {
	NovelID       string `json:"novelId"`
	SyncedChapter int    `json:"syncedChapter"`
	TotalFacts    int    `json:"totalFacts"`
	LatestChapter int    `json:"latestChapter"`
	CanContinue   int    `json:"canContinue"`
	UpdatedAt     string `json:"updatedAt"`
}

// NovelConfig 小说配置
type NovelConfig struct {
	NovelID     string `json:"novelId"`
	ConfigKey   string `json:"configKey"`
	ConfigValue string `json:"configValue"`
	UpdatedAt   string `json:"updatedAt"`
}

// StyleProfile 文风配置
type StyleProfile struct {
	ID          int    `json:"id"`
	NovelID     string `json:"novelId"`
	Name        string `json:"name"`
	Fingerprint string `json:"fingerprint"`
	LLMGuide    string `json:"llmGuide,omitempty"`
	IsActive    bool   `json:"isActive"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// --- 请求/响应 DTO ---

// ChatRequest Agent 聊天请求
type ChatRequest struct {
	Messages  []ChatMsg `json:"messages"`
	SessionID string    `json:"sessionId,omitempty"`
	NovelID   string    `json:"novelId,omitempty"`
	ChapterID int       `json:"chapterId,omitempty"`
	ModelID   string    `json:"modelId,omitempty"`
	Context   string    `json:"context,omitempty"`
}

// ChatMsg 聊天消息
type ChatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChapterCreateRequest 创建章节请求
type ChapterCreateRequest struct {
	NovelID string `json:"novelId"`
	Title   string `json:"title"`
	Content string `json:"content,omitempty"`
	Number  int    `json:"number"`
}

// ChapterUpdateRequest 更新章节请求
type ChapterUpdateRequest struct {
	Title   string `json:"title,omitempty"`
	Content string `json:"content,omitempty"`
	Status  string `json:"status,omitempty"`
}

// ChapterSaveRequest AI 保存章节请求
type ChapterSaveRequest struct {
	ChapterID   int    `json:"chapterId"`
	Content     string `json:"content"`
	Description string `json:"description,omitempty"`
}

// VersionRollbackRequest 回滚请求
type VersionRollbackRequest struct {
	VersionID string `json:"versionId"`
}

// PaginatedChapters 分页章节列表
type PaginatedChapters struct {
	Chapters []Chapter `json:"chapters"`
	Total    int       `json:"total"`
}

// MigrationRequest 迁移请求
type MigrationRequest struct {
	SourcePath string `json:"sourcePath"`
	NovelID    string `json:"novelId,omitempty"`
}
