package main

import (
	"log"
	"os"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/Majlo123/sugar-beet-backend/docs"
	"github.com/Majlo123/sugar-beet-backend/models"
	"github.com/Majlo123/sugar-beet-backend/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Napomena: .env fajl nije pronađen, koriste se postojeće env varijable.")
	}

	if err := config.InitDB(); err != nil {
		log.Fatalf("Nije moguće povezati se sa bazom: %v", err)
	}

	if !config.DB.Migrator().HasTable(&models.User{}) {
		if err := config.DB.AutoMigrate(&models.User{}); err != nil {
			log.Fatalf("Sinhronizacija modela nije uspela: %v", err)
		}
	}
	log.Println("Svi modeli su uspešno sinhronizovani.")

	if err := config.InitBlockchain(); err != nil {
		log.Fatalf("Nije moguće povezati se na blockchain: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	docs.RegisterSwagger(r)
	routes.RegisterRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Server sluša na portu %s", port)
	log.Printf("Swagger dokumentacija je dostupna na http://localhost:%s/api-docs", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server prekinut: %v", err)
	}
}
