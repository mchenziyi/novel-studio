package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"novel-studio-go/internal/models"
)

// ========== Novel ==========

func GetAllNovels(db *sql.DB) ([]models.Novel, error) {
	rows, err := db.Query(`SELECT id, title, description, author, cover_image, project_path, status, created_at, updated_at FROM novels ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var novels []models.Novel
	for rows.Next() {
		var n models.Novel
		var desc, author, cover, projectPath sql.NullString
		if err := rows.Scan(&n.ID, &n.Title, &desc, &author, &cover, &projectPath, &n.Status, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		n.Description = desc.String
		n.Author = author.String
		n.CoverImage = cover.String
		n.ProjectPath = projectPath.String
		novels = append(novels, n)
	}
	return novels, nil
}

func GetNovel(db *sql.DB, id string) (*models.Novel, error) {
	var n models.Novel
	var desc, author, cover, projectPath sql.NullString
	err := db.QueryRow(`SELECT id, title, description, author, cover_image, project_path, status, created_at, updated_at FROM novels WHERE id=?`, id).
		Scan(&n.ID, &n.Title, &desc, &author, &cover, &projectPath, &n.Status, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, err
	}
	n.Description = desc.String
	n.Author = author.String
	n.CoverImage = cover.String
	n.ProjectPath = projectPath.String
	return &n, nil
}

func CreateNovel(db *sql.DB, n *models.Novel) error {
	_, err := db.Exec(`INSERT INTO novels (id, title, description, author, cover_image, project_path, status) VALUES (?,?,?,?,?,?,?)`,
		n.ID, n.Title, n.Description, n.Author, n.CoverImage, n.ProjectPath, n.Status)
	return err
}

func UpdateNovel(db *sql.DB, n *models.Novel) error {
	_, err := db.Exec(`UPDATE novels SET title=?, description=?, author=?, cover_image=?, project_path=?, status=?, updated_at=datetime('now') WHERE id=?`,
		n.Title, n.Description, n.Author, n.CoverImage, n.ProjectPath, n.Status, n.ID)
	return err
}

// ========== Chapter ==========

func GetChapters(db *sql.DB, novelID string) ([]models.Chapter, error) {
	rows, err := db.Query(`SELECT id, novel_id, title, content, word_count, file, status, last_modified, created_at, updated_at FROM chapters WHERE novel_id=? ORDER BY id`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanChapters(rows)
}

func GetChapter(db *sql.DB, id string) (*models.Chapter, error) {
	var c models.Chapter
	var lastMod sql.NullString
	err := db.QueryRow(`SELECT id, novel_id, title, content, word_count, file, status, last_modified, created_at, updated_at FROM chapters WHERE id=?`, id).
		Scan(&c.ID, &c.NovelID, &c.Title, &c.Content, &c.WordCount, &c.File, &c.Status, &lastMod, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.LastModified = lastMod.String
	return &c, nil
}

func GetChapterByNumber(db *sql.DB, novelID string, number int) (*models.Chapter, error) {
	id := fmt.Sprintf("%04d", number)
	return GetChapter(db, id)
}

func CreateChapter(db *sql.DB, c *models.Chapter) error {
	_, err := db.Exec(`INSERT INTO chapters (id, novel_id, title, content, word_count, file, status) VALUES (?,?,?,?,?,?,?)`,
		c.ID, c.NovelID, c.Title, c.Content, c.WordCount, c.File, "pending")
	return err
}

func UpdateChapter(db *sql.DB, c *models.Chapter) error {
	_, err := db.Exec(`UPDATE chapters SET title=?, content=?, word_count=?, status=?, last_modified=datetime('now'), updated_at=datetime('now') WHERE id=?`,
		c.Title, c.Content, c.WordCount, c.Status, c.ID)
	return err
}

func UpdateChapterStatus(db *sql.DB, id string, status string) error {
	_, err := db.Exec(`UPDATE chapters SET status=?, updated_at=datetime('now') WHERE id=?`, status, id)
	return err
}

func DeleteChapter(db *sql.DB, id string) error {
	_, err := db.Exec(`DELETE FROM chapters WHERE id=?`, id)
	return err
}

func SearchChapters(db *sql.DB, novelID string, query string) ([]models.Chapter, error) {
	rows, err := db.Query(`SELECT id, novel_id, title, content, word_count, file, status, last_modified, created_at, updated_at FROM chapters WHERE novel_id=? AND (title LIKE ? OR content LIKE ?) ORDER BY id`,
		novelID, "%"+query+"%", "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanChapters(rows)
}

func scanChapters(rows *sql.Rows) ([]models.Chapter, error) {
	var chapters []models.Chapter
	for rows.Next() {
		var c models.Chapter
		var lastMod sql.NullString
		if err := rows.Scan(&c.ID, &c.NovelID, &c.Title, &c.Content, &c.WordCount, &c.File, &c.Status, &lastMod, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.LastModified = lastMod.String
		chapters = append(chapters, c)
	}
	return chapters, nil
}

// ========== ChapterVersion ==========

func GetChapterVersions(db *sql.DB, chapterID string, limit int) ([]models.ChapterVersion, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := db.Query(`SELECT id, chapter_id, content, timestamp, source, agent_name, description, git_commit_hash, created_at FROM chapter_versions WHERE chapter_id=? ORDER BY timestamp DESC LIMIT ?`, chapterID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []models.ChapterVersion
	for rows.Next() {
		var v models.ChapterVersion
		var agent, desc, gitHash sql.NullString
		if err := rows.Scan(&v.ID, &v.ChapterID, &v.Content, &v.Timestamp, &v.Source, &agent, &desc, &gitHash, &v.CreatedAt); err != nil {
			return nil, err
		}
		v.AgentName = agent.String
		v.Description = desc.String
		v.GitCommitHash = gitHash.String
		versions = append(versions, v)
	}
	return versions, nil
}

func CreateChapterVersion(db *sql.DB, v *models.ChapterVersion) error {
	_, err := db.Exec(`INSERT INTO chapter_versions (id, chapter_id, content, timestamp, source, agent_name, description, git_commit_hash) VALUES (?,?,?,?,?,?,?,?)`,
		v.ID, v.ChapterID, v.Content, v.Timestamp, v.Source, v.AgentName, v.Description, v.GitCommitHash)
	return err
}

func GetChapterVersion(db *sql.DB, id string) (*models.ChapterVersion, error) {
	var v models.ChapterVersion
	var agent, desc, gitHash sql.NullString
	err := db.QueryRow(`SELECT id, chapter_id, content, timestamp, source, agent_name, description, git_commit_hash, created_at FROM chapter_versions WHERE id=?`, id).
		Scan(&v.ID, &v.ChapterID, &v.Content, &v.Timestamp, &v.Source, &agent, &desc, &gitHash, &v.CreatedAt)
	if err != nil {
		return nil, err
	}
	v.AgentName = agent.String
	v.Description = desc.String
	v.GitCommitHash = gitHash.String
	return &v, nil
}

// ========== Character ==========

func GetCharacters(db *sql.DB, novelID string) ([]models.Character, error) {
	rows, err := db.Query(`SELECT id, novel_id, name, role, status, description, first_appearance, last_appearance, created_at, updated_at FROM characters WHERE novel_id=? ORDER BY name`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCharacters(rows)
}

func GetCharacter(db *sql.DB, id string) (*models.Character, error) {
	var c models.Character
	var desc, status sql.NullString
	var fa, la sql.NullInt64
	err := db.QueryRow(`SELECT id, novel_id, name, role, status, description, first_appearance, last_appearance, created_at, updated_at FROM characters WHERE id=?`, id).
		Scan(&c.ID, &c.NovelID, &c.Name, &c.Role, &status, &desc, &fa, &la, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Description = desc.String
	c.Status = status.String
	c.FirstAppearance = int(fa.Int64)
	c.LastAppearance = int(la.Int64)
	return &c, nil
}

func CreateCharacter(db *sql.DB, c *models.Character) error {
	_, err := db.Exec(`INSERT INTO characters (id, novel_id, name, role, status, description, first_appearance, last_appearance) VALUES (?,?,?,?,?,?,?,?)`,
		c.ID, c.NovelID, c.Name, c.Role, c.Status, c.Description, c.FirstAppearance, c.LastAppearance)
	return err
}

func UpdateCharacter(db *sql.DB, c *models.Character) error {
	_, err := db.Exec(`UPDATE characters SET name=?, role=?, status=?, description=?, first_appearance=?, last_appearance=?, updated_at=datetime('now') WHERE id=?`,
		c.Name, c.Role, c.Status, c.Description, c.FirstAppearance, c.LastAppearance, c.ID)
	return err
}

func scanCharacters(rows *sql.Rows) ([]models.Character, error) {
	var chars []models.Character
	for rows.Next() {
		var c models.Character
		var desc, status sql.NullString
		var fa, la sql.NullInt64
		if err := rows.Scan(&c.ID, &c.NovelID, &c.Name, &c.Role, &status, &desc, &fa, &la, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Description = desc.String
		c.Status = status.String
		c.FirstAppearance = int(fa.Int64)
		c.LastAppearance = int(la.Int64)
		chars = append(chars, c)
	}
	return chars, nil
}

// ========== Foreshadowing ==========

func GetForeshadowings(db *sql.DB, novelID string, status string) ([]models.Foreshadowing, error) {
	query := `SELECT id, novel_id, name, description, status, planted_chapter, resolved_chapter, created_at, updated_at FROM foreshadowing WHERE novel_id=?`
	args := []interface{}{novelID}
	if status != "" && status != "all" {
		query += ` AND status=?`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanForeshadowings(rows)
}

func CreateForeshadowing(db *sql.DB, f *models.Foreshadowing) error {
	_, err := db.Exec(`INSERT INTO foreshadowing (id, novel_id, name, description, status, planted_chapter, resolved_chapter) VALUES (?,?,?,?,?,?,?)`,
		f.ID, f.NovelID, f.Name, f.Description, f.Status, f.PlantedChapter, f.ResolvedChapter)
	return err
}

func UpdateForeshadowing(db *sql.DB, f *models.Foreshadowing) error {
	_, err := db.Exec(`UPDATE foreshadowing SET name=?, description=?, status=?, planted_chapter=?, resolved_chapter=?, updated_at=datetime('now') WHERE id=?`,
		f.Name, f.Description, f.Status, f.PlantedChapter, f.ResolvedChapter, f.ID)
	return err
}

func scanForeshadowings(rows *sql.Rows) ([]models.Foreshadowing, error) {
	var items []models.Foreshadowing
	for rows.Next() {
		var f models.Foreshadowing
		var desc sql.NullString
		var pc, rc sql.NullInt64
		if err := rows.Scan(&f.ID, &f.NovelID, &f.Name, &desc, &f.Status, &pc, &rc, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		f.Description = desc.String
		f.PlantedChapter = int(pc.Int64)
		f.ResolvedChapter = int(rc.Int64)
		items = append(items, f)
	}
	return items, nil
}

// ========== Outline ==========

func GetOutline(db *sql.DB, novelID string) (*models.Outline, error) {
	var o models.Outline
	err := db.QueryRow(`SELECT id, novel_id, content, updated_at FROM outline WHERE novel_id=?`, novelID).
		Scan(&o.ID, &o.NovelID, &o.Content, &o.UpdatedAt)
	if err == sql.ErrNoRows {
		return &models.Outline{NovelID: novelID, Content: ""}, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func UpsertOutline(db *sql.DB, o *models.Outline) error {
	_, err := db.Exec(`INSERT INTO outline (id, novel_id, content, updated_at) VALUES (?,?,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET content=?, updated_at=datetime('now')`,
		o.ID, o.NovelID, o.Content, o.Content)
	return err
}

// ========== Chat ==========

func CreateChatSession(db *sql.DB, s *models.ChatSession) error {
	_, err := db.Exec(`INSERT INTO chat_sessions (id, novel_id, title, chapter_id, context, model) VALUES (?,?,?,?,?,?)`,
		s.ID, s.NovelID, s.Title, s.ChapterID, s.Context, s.Model)
	return err
}

func GetChatSession(db *sql.DB, id string) (*models.ChatSession, error) {
	var s models.ChatSession
	var chapterID, model, deletedAt sql.NullString
	err := db.QueryRow(`SELECT id, novel_id, title, chapter_id, context, model, deleted_at, created_at, updated_at FROM chat_sessions WHERE id=? AND deleted_at IS NULL`, id).
		Scan(&s.ID, &s.NovelID, &s.Title, &chapterID, &s.Context, &model, &deletedAt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	s.ChapterID = chapterID.String
	s.Model = model.String
	return &s, nil
}

func GetChatSessions(db *sql.DB, novelID string) ([]models.ChatSession, error) {
	rows, err := db.Query(`SELECT id, novel_id, title, chapter_id, context, model, deleted_at, created_at, updated_at FROM chat_sessions WHERE novel_id=? AND deleted_at IS NULL ORDER BY updated_at DESC`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.ChatSession
	for rows.Next() {
		var s models.ChatSession
		var chapterID, model, deletedAt sql.NullString
		if err := rows.Scan(&s.ID, &s.NovelID, &s.Title, &chapterID, &s.Context, &model, &deletedAt, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.ChapterID = chapterID.String
		s.Model = model.String
		sessions = append(sessions, s)
	}
	return sessions, nil
}

func UpdateChatSessionTitle(db *sql.DB, id string, title string) error {
	_, err := db.Exec(`UPDATE chat_sessions SET title=?, updated_at=datetime('now') WHERE id=?`, title, id)
	return err
}

func SoftDeleteChatSession(db *sql.DB, id string) error {
	_, err := db.Exec(`UPDATE chat_sessions SET deleted_at=datetime('now'), updated_at=datetime('now') WHERE id=?`, id)
	return err
}

func RestoreChatSession(db *sql.DB, id string) error {
	_, err := db.Exec(`UPDATE chat_sessions SET deleted_at=NULL, updated_at=datetime('now') WHERE id=?`, id)
	return err
}

func AddChatMessage(db *sql.DB, m *models.ChatMessage) error {
	_, err := db.Exec(`INSERT INTO chat_messages (id, session_id, role, content, metadata) VALUES (?,?,?,?,?)`,
		m.ID, m.SessionID, m.Role, m.Content, m.Metadata)
	return err
}

func GetChatMessages(db *sql.DB, sessionID string) ([]models.ChatMessage, error) {
	rows, err := db.Query(`SELECT id, session_id, role, content, metadata, created_at FROM chat_messages WHERE session_id=? ORDER BY created_at ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		var metadata sql.NullString
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &metadata, &m.CreatedAt); err != nil {
			return nil, err
		}
		m.Metadata = metadata.String
		msgs = append(msgs, m)
	}
	return msgs, nil
}

// ========== Memory ==========

func CreateMemory(db *sql.DB, m *models.Memory) error {
	_, err := db.Exec(`INSERT INTO memories (id, novel_id, category, key, content, source, importance) VALUES (?,?,?,?,?,?,?)`,
		m.ID, m.NovelID, m.Category, m.Key, m.Content, m.Source, m.Importance)
	return err
}

func SearchMemories(db *sql.DB, novelID string, query string, category string) ([]models.Memory, error) {
	q := `SELECT id, novel_id, category, key, content, source, importance, use_count, created_at, updated_at FROM memories WHERE novel_id=?`
	args := []interface{}{novelID}
	if query != "" {
		q += ` AND (key LIKE ? OR content LIKE ?)`
		args = append(args, "%"+query+"%", "%"+query+"%")
	}
	if category != "" {
		q += ` AND category=?`
		args = append(args, category)
	}
	q += ` ORDER BY importance DESC, created_at DESC`

	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMemories(rows)
}

func ListMemories(db *sql.DB, novelID string, category string) ([]models.Memory, error) {
	return SearchMemories(db, novelID, "", category)
}

func GetMemory(db *sql.DB, id string) (*models.Memory, error) {
	var m models.Memory
	var source sql.NullString
	err := db.QueryRow(`SELECT id, novel_id, category, key, content, source, importance, use_count, created_at, updated_at FROM memories WHERE id=?`, id).
		Scan(&m.ID, &m.NovelID, &m.Category, &m.Key, &m.Content, &source, &m.Importance, &m.UseCount, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	m.Source = source.String
	return &m, nil
}

func IncrementMemoryUseCount(db *sql.DB, id string) error {
	_, err := db.Exec(`UPDATE memories SET use_count=use_count+1, updated_at=datetime('now') WHERE id=?`, id)
	return err
}

func scanMemories(rows *sql.Rows) ([]models.Memory, error) {
	var items []models.Memory
	for rows.Next() {
		var m models.Memory
		var source sql.NullString
		if err := rows.Scan(&m.ID, &m.NovelID, &m.Category, &m.Key, &m.Content, &source, &m.Importance, &m.UseCount, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Source = source.String
		items = append(items, m)
	}
	return items, nil
}

// ========== Style Profile ==========

func GetStyleProfiles(db *sql.DB, novelID string) ([]models.StyleProfile, error) {
	rows, err := db.Query(`SELECT id, novel_id, name, fingerprint, llm_guide, is_active, created_at, updated_at FROM style_profiles WHERE novel_id=? ORDER BY is_active DESC, updated_at DESC`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []models.StyleProfile
	for rows.Next() {
		var sp models.StyleProfile
		var llmGuide sql.NullString
		if err := rows.Scan(&sp.ID, &sp.NovelID, &sp.Name, &sp.Fingerprint, &llmGuide, &sp.IsActive, &sp.CreatedAt, &sp.UpdatedAt); err != nil {
			return nil, err
		}
		sp.LLMGuide = llmGuide.String
		profiles = append(profiles, sp)
	}
	return profiles, nil
}

func GetActiveStyleProfile(db *sql.DB, novelID string) (*models.StyleProfile, error) {
	var sp models.StyleProfile
	var llmGuide sql.NullString
	err := db.QueryRow(`SELECT id, novel_id, name, fingerprint, llm_guide, is_active, created_at, updated_at FROM style_profiles WHERE novel_id=? AND is_active=1`, novelID).
		Scan(&sp.ID, &sp.NovelID, &sp.Name, &sp.Fingerprint, &llmGuide, &sp.IsActive, &sp.CreatedAt, &sp.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	sp.LLMGuide = llmGuide.String
	return &sp, nil
}

func CreateStyleProfile(db *sql.DB, sp *models.StyleProfile) error {
	_, err := db.Exec(`INSERT INTO style_profiles (novel_id, name, fingerprint, llm_guide, is_active) VALUES (?,?,?,?,?)`,
		sp.NovelID, sp.Name, sp.Fingerprint, sp.LLMGuide, sp.IsActive)
	return err
}

func DeactivateStyleProfiles(db *sql.DB, novelID string) error {
	_, err := db.Exec(`UPDATE style_profiles SET is_active=0, updated_at=datetime('now') WHERE novel_id=?`, novelID)
	return err
}

func ActivateStyleProfile(db *sql.DB, id int) error {
	_, err := db.Exec(`UPDATE style_profiles SET is_active=1, updated_at=datetime('now') WHERE id=?`, id)
	return err
}

func DeleteStyleProfile(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM style_profiles WHERE id=?`, id)
	return err
}

// ========== Model Config ==========

func GetModelConfigs(db *sql.DB) ([]models.ModelConfig, error) {
	rows, err := db.Query(`SELECT id, name, provider, enabled, is_default, settings, created_at, updated_at FROM model_configs ORDER BY is_default DESC, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []models.ModelConfig
	for rows.Next() {
		var mc models.ModelConfig
		var en, def int
		if err := rows.Scan(&mc.ID, &mc.Name, &mc.Provider, &en, &def, &mc.Settings, &mc.CreatedAt, &mc.UpdatedAt); err != nil {
			return nil, err
		}
		mc.Enabled = en == 1
		mc.IsDefault = def == 1
		configs = append(configs, mc)
	}
	return configs, nil
}

func CreateModelConfig(db *sql.DB, mc *models.ModelConfig) error {
	en, def := 0, 0
	if mc.Enabled {
		en = 1
	}
	if mc.IsDefault {
		def = 1
	}
	_, err := db.Exec(`INSERT INTO model_configs (id, name, provider, enabled, is_default, settings) VALUES (?,?,?,?,?,?)`,
		mc.ID, mc.Name, mc.Provider, en, def, mc.Settings)
	return err
}

func UpdateModelConfig(db *sql.DB, mc *models.ModelConfig) error {
	en, def := 0, 0
	if mc.Enabled {
		en = 1
	}
	if mc.IsDefault {
		def = 1
	}
	_, err := db.Exec(`UPDATE model_configs SET name=?, provider=?, enabled=?, is_default=?, settings=?, updated_at=datetime('now') WHERE id=?`,
		mc.Name, mc.Provider, en, def, mc.Settings, mc.ID)
	return err
}

func DeleteModelConfig(db *sql.DB, id string) error {
	_, err := db.Exec(`DELETE FROM model_configs WHERE id=?`, id)
	return err
}

// ========== Novel Config ==========

func GetNovelConfigs(db *sql.DB, novelID string) (map[string]string, error) {
	rows, err := db.Query(`SELECT config_key, config_value FROM novel_configs WHERE novel_id=?`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		configs[k] = v
	}
	return configs, nil
}

func SetNovelConfig(db *sql.DB, novelID string, key string, value string) error {
	_, err := db.Exec(`INSERT INTO novel_configs (novel_id, config_key, config_value, updated_at) VALUES (?,?,?,datetime('now')) ON CONFLICT(novel_id,config_key) DO UPDATE SET config_value=?, updated_at=datetime('now')`,
		novelID, key, value, value)
	return err
}

// ========== Story ==========

func GetStoryFacts(db *sql.DB, novelID string, chapter int) ([]models.StoryFact, error) {
	query := `SELECT id, novel_id, chapter, category, subject, content, sources, created_at FROM story_facts WHERE novel_id=?`
	args := []interface{}{novelID}
	if chapter > 0 {
		query += ` AND chapter=?`
		args = append(args, chapter)
	}
	query += ` ORDER BY chapter, category`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var facts []models.StoryFact
	for rows.Next() {
		var f models.StoryFact
		var sources sql.NullString
		if err := rows.Scan(&f.ID, &f.NovelID, &f.Chapter, &f.Category, &f.Subject, &f.Content, &sources, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.Sources = sources.String
		facts = append(facts, f)
	}
	return facts, nil
}

func AddStoryFact(db *sql.DB, f *models.StoryFact) error {
	_, err := db.Exec(`INSERT INTO story_facts (id, novel_id, chapter, category, subject, content, sources) VALUES (?,?,?,?,?,?,?)`,
		f.ID, f.NovelID, f.Chapter, f.Category, f.Subject, f.Content, f.Sources)
	return err
}

func GetStoryHooks(db *sql.DB, novelID string, status string) ([]models.StoryHook, error) {
	query := `SELECT id, novel_id, chapter, type, content, fact_ids, status, updated_at FROM story_hooks WHERE novel_id=?`
	args := []interface{}{novelID}
	if status != "" && status != "all" {
		query += ` AND status=?`
		args = append(args, status)
	}
	query += ` ORDER BY chapter, id`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hooks []models.StoryHook
	for rows.Next() {
		var h models.StoryHook
		var chapter sql.NullInt64
		var factIDs sql.NullString
		if err := rows.Scan(&h.ID, &h.NovelID, &chapter, &h.Type, &h.Content, &factIDs, &h.Status, &h.UpdatedAt); err != nil {
			return nil, err
		}
		h.Chapter = int(chapter.Int64)
		h.FactIDs = factIDs.String
		hooks = append(hooks, h)
	}
	return hooks, nil
}

func AddStoryHook(db *sql.DB, h *models.StoryHook) error {
	_, err := db.Exec(`INSERT INTO story_hooks (id, novel_id, chapter, type, content, fact_ids, status) VALUES (?,?,?,?,?,?,?)`,
		h.ID, h.NovelID, h.Chapter, h.Type, h.Content, h.FactIDs, h.Status)
	return err
}

func UpdateStoryHook(db *sql.DB, h *models.StoryHook) error {
	_, err := db.Exec(`UPDATE story_hooks SET chapter=?, type=?, content=?, fact_ids=?, status=?, updated_at=datetime('now') WHERE id=?`,
		h.Chapter, h.Type, h.Content, h.FactIDs, h.Status, h.ID)
	return err
}

func GetStorySummaries(db *sql.DB, novelID string) ([]models.StorySummary, error) {
	rows, err := db.Query(`SELECT id, novel_id, chapter, title, summary, key_events, fact_range, updated_at FROM story_summaries WHERE novel_id=? ORDER BY chapter`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.StorySummary
	for rows.Next() {
		var s models.StorySummary
		var title, summary, keyEvents, factRange sql.NullString
		if err := rows.Scan(&s.ID, &s.NovelID, &s.Chapter, &title, &summary, &keyEvents, &factRange, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Title = title.String
		s.Summary = summary.String
		s.KeyEvents = keyEvents.String
		s.FactRange = factRange.String
		items = append(items, s)
	}
	return items, nil
}

func UpsertStorySummary(db *sql.DB, s *models.StorySummary) error {
	_, err := db.Exec(`INSERT INTO story_summaries (novel_id, chapter, title, summary, key_events, fact_range) VALUES (?,?,?,?,?,?) ON CONFLICT(novel_id,chapter) DO UPDATE SET title=?, summary=?, key_events=?, fact_range=?, updated_at=datetime('now')`,
		s.NovelID, s.Chapter, s.Title, s.Summary, s.KeyEvents, s.FactRange,
		s.Title, s.Summary, s.KeyEvents, s.FactRange)
	return err
}

func GetStoryState(db *sql.DB, novelID string) ([]models.StoryState, error) {
	rows, err := db.Query(`SELECT id, novel_id, category, key, value, updated_at FROM story_state WHERE novel_id=?`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.StoryState
	for rows.Next() {
		var s models.StoryState
		var category, value sql.NullString
		if err := rows.Scan(&s.ID, &s.NovelID, &category, &s.Key, &value, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Category = category.String
		s.Value = value.String
		items = append(items, s)
	}
	return items, nil
}

func SetStoryState(db *sql.DB, novelID string, category string, key string, value string) error {
	_, err := db.Exec(`INSERT INTO story_state (novel_id, category, key, value) VALUES (?,?,?,?) ON CONFLICT(novel_id,category,key) DO UPDATE SET value=?, updated_at=datetime('now')`,
		novelID, category, key, value, value)
	return err
}

func GetStoryCharacters(db *sql.DB, novelID string) ([]models.StoryCharacter, error) {
	rows, err := db.Query(`SELECT id, novel_id, name, role, status, personality, speaking_style, current_state, relations, updated_at FROM story_characters WHERE novel_id=?`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.StoryCharacter
	for rows.Next() {
		var sc models.StoryCharacter
		var role, status, personality, speakingStyle, currentState, relations sql.NullString
		if err := rows.Scan(&sc.ID, &sc.NovelID, &sc.Name, &role, &status, &personality, &speakingStyle, &currentState, &relations, &sc.UpdatedAt); err != nil {
			return nil, err
		}
		sc.Role = role.String
		sc.Status = status.String
		sc.Personality = personality.String
		sc.SpeakingStyle = speakingStyle.String
		sc.CurrentState = currentState.String
		sc.Relations = relations.String
		items = append(items, sc)
	}
	return items, nil
}

func UpsertStoryCharacter(db *sql.DB, sc *models.StoryCharacter) error {
	_, err := db.Exec(`INSERT INTO story_characters (novel_id, name, role, status, personality, speaking_style, current_state, relations) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(novel_id,name) DO UPDATE SET role=?, status=?, personality=?, speaking_style=?, current_state=?, relations=?, updated_at=datetime('now')`,
		sc.NovelID, sc.Name, sc.Role, sc.Status, sc.Personality, sc.SpeakingStyle, sc.CurrentState, sc.Relations,
		sc.Role, sc.Status, sc.Personality, sc.SpeakingStyle, sc.CurrentState, sc.Relations)
	return err
}

func GetStoryPlotlines(db *sql.DB, novelID string) ([]models.StoryPlotline, error) {
	rows, err := db.Query(`SELECT id, novel_id, name, status, start_chapter, end_chapter, description, updated_at FROM story_plotlines WHERE novel_id=? ORDER BY start_chapter`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.StoryPlotline
	for rows.Next() {
		var p models.StoryPlotline
		var sc, ec sql.NullInt64
		var desc sql.NullString
		if err := rows.Scan(&p.ID, &p.NovelID, &p.Name, &p.Status, &sc, &ec, &desc, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.StartChapter = int(sc.Int64)
		p.EndChapter = int(ec.Int64)
		p.Description = desc.String
		items = append(items, p)
	}
	return items, nil
}

func UpsertStoryPlotline(db *sql.DB, p *models.StoryPlotline) error {
	_, err := db.Exec(`INSERT INTO story_plotlines (id, novel_id, name, status, start_chapter, end_chapter, description) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=?, status=?, start_chapter=?, end_chapter=?, description=?, updated_at=datetime('now')`,
		p.ID, p.NovelID, p.Name, p.Status, p.StartChapter, p.EndChapter, p.Description,
		p.Name, p.Status, p.StartChapter, p.EndChapter, p.Description)
	return err
}

func GetStoryResources(db *sql.DB, novelID string) ([]models.StoryResource, error) {
	rows, err := db.Query(`SELECT id, novel_id, chapter, resource_name, change_type, amount, description, fact_id, updated_at FROM story_resources WHERE novel_id=? ORDER BY chapter`, novelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.StoryResource
	for rows.Next() {
		var r models.StoryResource
		var chapter sql.NullInt64
		var ct, amount, desc, factID sql.NullString
		if err := rows.Scan(&r.ID, &r.NovelID, &chapter, &r.ResourceName, &ct, &amount, &desc, &factID, &r.UpdatedAt); err != nil {
			return nil, err
		}
		r.Chapter = int(chapter.Int64)
		r.ChangeType = ct.String
		r.Amount = amount.String
		r.Description = desc.String
		r.FactID = factID.String
		items = append(items, r)
	}
	return items, nil
}

func AddStoryResource(db *sql.DB, r *models.StoryResource) error {
	_, err := db.Exec(`INSERT INTO story_resources (novel_id, chapter, resource_name, change_type, amount, description, fact_id) VALUES (?,?,?,?,?,?,?)`,
		r.NovelID, r.Chapter, r.ResourceName, r.ChangeType, r.Amount, r.Description, r.FactID)
	return err
}

func GetStorySync(db *sql.DB, novelID string) (*models.StorySync, error) {
	var s models.StorySync
	err := db.QueryRow(`SELECT novel_id, synced_chapter, total_facts, latest_chapter, can_continue, updated_at FROM story_sync WHERE novel_id=?`, novelID).
		Scan(&s.NovelID, &s.SyncedChapter, &s.TotalFacts, &s.LatestChapter, &s.CanContinue, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return &models.StorySync{NovelID: novelID}, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func UpsertStorySync(db *sql.DB, s *models.StorySync) error {
	_, err := db.Exec(`INSERT INTO story_sync (novel_id, synced_chapter, total_facts, latest_chapter, can_continue) VALUES (?,?,?,?,?) ON CONFLICT(novel_id) DO UPDATE SET synced_chapter=?, total_facts=?, latest_chapter=?, can_continue=?, updated_at=datetime('now')`,
		s.NovelID, s.SyncedChapter, s.TotalFacts, s.LatestChapter, s.CanContinue,
		s.SyncedChapter, s.TotalFacts, s.LatestChapter, s.CanContinue)
	return err
}

// ========== Settings ==========

func GetSetting(db *sql.DB, key string) (string, error) {
	var val string
	err := db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&val)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return val, err
}

func SetSetting(db *sql.DB, key string, value string) error {
	_, err := db.Exec(`INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=?, updated_at=datetime('now')`,
		key, value, value)
	return err
}

// ========== Stats ==========

type StatsRow struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Words   int    `json:"words"`
	Status  string `json:"status"`
	Updated string `json:"updated"`
}

func GetChapterStats(db *sql.DB, novelID string) (totalChapters int, totalWords int, recentChapters []StatsRow, err error) {
	db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(word_count),0) FROM chapters WHERE novel_id=?`, novelID).Scan(&totalChapters, &totalWords)

	rows, err := db.Query(`SELECT id, title, word_count, status, COALESCE(last_modified, updated_at) FROM chapters WHERE novel_id=? ORDER BY id DESC LIMIT 5`, novelID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var r StatsRow
		if err = rows.Scan(&r.ID, &r.Title, &r.Words, &r.Status, &r.Updated); err != nil {
			return
		}
		recentChapters = append(recentChapters, r)
	}
	return
}

// ========== Migrations ==========

// BulkInsertChapters 批量导入章节
func BulkInsertChapters(db *sql.DB, chapters []models.Chapter) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO chapters (id, novel_id, title, content, word_count, file, status, last_modified) VALUES (?,?,?,?,?,?,?,?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range chapters {
		_, err := stmt.Exec(c.ID, c.NovelID, c.Title, c.Content, c.WordCount, c.File, c.Status, c.LastModified)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// BulkInsertCharacters 批量导入角色
func BulkInsertCharacters(db *sql.DB, chars []models.Character) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, c := range chars {
		_, err := tx.Exec(`INSERT OR REPLACE INTO characters (id, novel_id, name, role, status, description, first_appearance, last_appearance) VALUES (?,?,?,?,?,?,?,?)`,
			c.ID, c.NovelID, c.Name, c.Role, c.Status, c.Description, c.FirstAppearance, c.LastAppearance)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// BulkInsertForeshadowings 批量导入伏笔
func BulkInsertForeshadowings(db *sql.DB, items []models.Foreshadowing) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, f := range items {
		_, err := tx.Exec(`INSERT OR REPLACE INTO foreshadowing (id, novel_id, name, description, status, planted_chapter, resolved_chapter) VALUES (?,?,?,?,?,?,?)`,
			f.ID, f.NovelID, f.Name, f.Description, f.Status, f.PlantedChapter, f.ResolvedChapter)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ExecuteRaw 执行原始 SQL（迁移用）
func ExecuteRaw(db *sql.DB, sql string) error {
	for _, stmt := range strings.Split(sql, ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("exec: %s: %w", stmt[:min(len(stmt), 80)], err)
		}
	}
	return nil
}
