package service

import (
	"database/sql"
	"novel-studio-go/internal/models"
	"novel-studio-go/internal/repository"
)

type CharacterService struct{ DB *sql.DB }

func (s *CharacterService) List(novelID string) ([]models.Character, error) {
	return repository.GetCharacters(s.DB, novelID)
}

func (s *CharacterService) Get(id string) (*models.Character, error) {
	return repository.GetCharacter(s.DB, id)
}

func (s *CharacterService) Create(c *models.Character) error {
	return repository.CreateCharacter(s.DB, c)
}

func (s *CharacterService) Update(c *models.Character) error {
	return repository.UpdateCharacter(s.DB, c)
}
