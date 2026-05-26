package controllers

import (
	"log"
	"net/http"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

func GetTokenPrice(c *gin.Context) {
	result, err := services.FetchTokenPrice()
	if err != nil {
		log.Printf("Error fetching token price: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}
