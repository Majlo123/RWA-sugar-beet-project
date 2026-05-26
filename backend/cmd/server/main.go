package main

import (
	"log"
	"os"
	"time"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/Majlo123/sugar-beet-backend/docs"
	"github.com/Majlo123/sugar-beet-backend/models"
	"github.com/Majlo123/sugar-beet-backend/routes"
	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var kycColumns = []string{
	"KYCStatus", "KYCFullName", "KYCDocumentType", "KYCDocumentNumber",
	"KYCDateOfBirth", "KYCCountry", "KYCDocumentPath",
	"KYCSubmittedAt", "KYCReviewedAt", "KYCRejectionReason",
}

func syncUserModel() error {
	migrator := config.DB.Migrator()

	if !migrator.HasTable(&models.User{}) {
		if err := config.DB.AutoMigrate(&models.User{}); err != nil {
			return err
		}
		return nil
	}

	for _, field := range kycColumns {
		if !migrator.HasColumn(&models.User{}, field) {
			if err := migrator.AddColumn(&models.User{}, field); err != nil {
				return err
			}
			log.Printf("Dodata kolona u Users tabelu: %s", field)
		}
	}
	return nil
}

func syncPaymentModel() error {
	return config.DB.AutoMigrate(&models.Payment{})
}

// startPaymentSweeper periodically reconciles PENDING payments with the PSP.
// Catches the case where the user closes the browser before reaching the
// success page, so the on-chain mint still happens (or the payment is
// marked EXPIRED if abandoned).
func startPaymentSweeper() {
	const interval = 60 * time.Second
	const orphanThreshold = 90 * time.Second

	go func() {
		// Small delay so the server is fully up before the first sweep.
		time.Sleep(30 * time.Second)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			services.SweepOrphanedPayments(orphanThreshold)
			<-ticker.C
		}
	}()
	log.Printf("Payment sweeper pokrenut (interval %s, prag %s)", interval, orphanThreshold)
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Napomena: .env fajl nije pronađen, koriste se postojeće env varijable.")
	}

	if err := config.InitDB(); err != nil {
		log.Fatalf("Nije moguće povezati se sa bazom: %v", err)
	}

	if err := syncUserModel(); err != nil {
		log.Fatalf("Sinhronizacija User modela nije uspela: %v", err)
	}
	if err := syncPaymentModel(); err != nil {
		log.Fatalf("Sinhronizacija Payment modela nije uspela: %v", err)
	}
	log.Println("Svi modeli su uspešno sinhronizovani.")

	if err := config.SeedDatabase(); err != nil {
		log.Fatalf("Seed podataka nije uspela: %v", err)
	}

	if err := config.InitBlockchain(); err != nil {
		log.Printf("UPOZORENJE: Blockchain nije dostupan (%v). Treasury endpoint-i neće raditi.", err)
	}

	startPaymentSweeper()

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
