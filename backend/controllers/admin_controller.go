package controllers

import (
	"log"
	"net/http"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

func GetAnalytics(c *gin.Context) {
	data, err := services.GetAdminAnalytics()
	if err != nil {
		log.Printf("Greška pri dohvatanju analitike: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Došlo je do greške na serveru."})
		return
	}
	c.JSON(http.StatusOK, data)
}
