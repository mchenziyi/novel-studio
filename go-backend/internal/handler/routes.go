package handler

import (
	"database/sql"
	"fmt"
	"net/http"

	"novel-studio-go/internal/models"
	"novel-studio-go/internal/service"

	"github.com/gin-gonic/gin"
)

// Characters, Foreshadowing, Outline handlers — thin wrappers

func RegisterCharacterRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.CharacterService{DB: db}
	g := r.Group("/characters")
	g.GET("", func(c *gin.Context) {
		list, err := svc.List(c.DefaultQuery("novelId", "default"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.Character{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var char models.Character
		if err := c.ShouldBindJSON(&char); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if char.NovelID == "" { char.NovelID = "default" }
		if err := svc.Create(&char); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, char)
	})
	g.PUT("/:id", func(c *gin.Context) {
		var char models.Character
		if err := c.ShouldBindJSON(&char); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		char.ID = c.Param("id")
		if err := svc.Update(&char); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, char)
	})
}

func RegisterForeshadowingRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.ForeshadowingService{DB: db}
	g := r.Group("/foreshadowing")
	g.GET("", func(c *gin.Context) {
		status := c.DefaultQuery("status", "all")
		list, err := svc.List(c.DefaultQuery("novelId", "default"), status)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.Foreshadowing{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var f models.Foreshadowing
		if err := c.ShouldBindJSON(&f); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if f.NovelID == "" { f.NovelID = "default" }
		if err := svc.Create(&f); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, f)
	})
	g.PUT("/:id", func(c *gin.Context) {
		var f models.Foreshadowing
		if err := c.ShouldBindJSON(&f); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		f.ID = c.Param("id")
		if err := svc.Update(&f); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, f)
	})
}

func RegisterOutlineRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.OutlineService{DB: db}
	g := r.Group("/outline")
	g.GET("", func(c *gin.Context) {
		o, err := svc.Get(c.DefaultQuery("novelId", "default"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, o)
	})
	g.PUT("", func(c *gin.Context) {
		var o models.Outline
		if err := c.ShouldBindJSON(&o); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if o.NovelID == "" { o.NovelID = "default" }
		if err := svc.Save(&o); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, o)
	})
}

func RegisterNovelRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.NovelService{DB: db}
	g := r.Group("/novels")
	g.GET("", func(c *gin.Context) {
		list, err := svc.List()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.Novel{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var n models.Novel
		if err := c.ShouldBindJSON(&n); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := svc.Create(&n); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, n)
	})
	g.PUT("/:id", func(c *gin.Context) {
		var n models.Novel
		if err := c.ShouldBindJSON(&n); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		n.ID = c.Param("id")
		if err := svc.Update(&n); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, n)
	})
	g.GET("/:id/config", func(c *gin.Context) {
		configs, err := svc.GetConfigs(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, configs)
	})
	g.PUT("/:id/config", func(c *gin.Context) {
		var req map[string]string
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		for k, v := range req {
			svc.SetConfig(c.Param("id"), k, v)
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}

func RegisterModelRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.ModelService{DB: db}
	g := r.Group("/models")
	g.GET("", func(c *gin.Context) {
		list, err := svc.List()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.ModelConfig{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var mc models.ModelConfig
		if err := c.ShouldBindJSON(&mc); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := svc.Create(&mc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, mc)
	})
	g.PUT("/:id", func(c *gin.Context) {
		var mc models.ModelConfig
		if err := c.ShouldBindJSON(&mc); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		mc.ID = c.Param("id")
		if err := svc.Update(&mc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, mc)
	})
	g.DELETE("/:id", func(c *gin.Context) {
		if err := svc.Delete(c.Param("id")); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}

func RegisterStyleRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.StyleService{DB: db}
	g := r.Group("/style")
	g.GET("", func(c *gin.Context) {
		list, err := svc.List(c.DefaultQuery("novelId", "default"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.StyleProfile{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var sp models.StyleProfile
		if err := c.ShouldBindJSON(&sp); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if sp.NovelID == "" { sp.NovelID = "default" }
		if err := svc.Create(&sp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, sp)
	})
	g.POST("/:id/activate", func(c *gin.Context) {
		id := 0
		c.ShouldBindJSON(&struct{ ID int `json:"id"` }{ID: id})
		// Get the profile to activate
		sp := &models.StyleProfile{ID: id}
		if err := svc.Activate(sp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	g.DELETE("/:id", func(c *gin.Context) {
		id := 0
		fmt.Sscanf(c.Param("id"), "%d", &id)
		if err := svc.Delete(id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}

func RegisterPlotlineRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.StoryService{DB: db}
	g := r.Group("/plotlines")
	g.GET("", func(c *gin.Context) {
		list, err := svc.GetPlotlines(c.DefaultQuery("novelId", "default"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if list == nil { list = []models.StoryPlotline{} }
		c.JSON(http.StatusOK, list)
	})
	g.POST("", func(c *gin.Context) {
		var p models.StoryPlotline
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if p.NovelID == "" { p.NovelID = "default" }
		if err := svc.UpsertPlotline(&p); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, p)
	})
	g.PUT("/:id", func(c *gin.Context) {
		var p models.StoryPlotline
		if err := c.ShouldBindJSON(&p); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		p.ID = c.Param("id")
		if err := svc.UpsertPlotline(&p); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, p)
	})
}

func RegisterSearchRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.ChapterService{DB: db}
	g := r.Group("/search")
	g.GET("", func(c *gin.Context) {
		q := c.Query("q")
		novelID := c.DefaultQuery("novelId", "default")
		results, err := svc.Search(novelID, q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, results)
	})
}

func RegisterStatsRoutes(r *gin.RouterGroup, db *sql.DB) {
	svc := &service.ChapterService{DB: db}
	r.GET("/stats", func(c *gin.Context) {
		stats, err := svc.Stats(c.DefaultQuery("novelId", "default"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, stats)
	})
}
