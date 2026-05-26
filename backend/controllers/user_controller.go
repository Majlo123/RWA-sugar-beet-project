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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error."})
		return
	}
	claims, ok := val.(*services.CustomClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error."})
		return
	}

	user, err := repositories.FindUserByID(claims.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server error."})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found."})
		return
	}

	c.JSON(http.StatusOK, user)
}
