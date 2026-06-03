package config

import "os"

type Config struct {
	Port    string
	DataDir string
	DBPath  string
}

func Load() *Config {
	cfg := &Config{
		Port:    envDefault("PORT", "3000"),
		DataDir: envDefault("DATA_DIR", "./data"),
	}
	cfg.DBPath = cfg.DataDir + "/novel-studio.db"
	return cfg
}

func envDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
