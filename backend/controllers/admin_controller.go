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
		log.Printf("Error fetching analytics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, data)
}
