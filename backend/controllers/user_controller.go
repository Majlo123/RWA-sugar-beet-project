package controllers

import (
	"net/http"

	"github.com/Majlo123/sugar-beet-backend/repositories"
	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

func GetProfile(c *gin.Context) {
	val, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Greška na serveru."})
		return
	}
	claims, ok := val.(*services.CustomClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Greška na serveru."})
		return
	}

	user, err := repositories.FindUserByID(claims.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Greška na serveru."})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Korisnik nije pronađen."})
		return
	}

	c.JSON(http.StatusOK, user)
}
