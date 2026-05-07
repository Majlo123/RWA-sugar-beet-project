package controllers

import (
	"net/http"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

type registerRequest struct {
	Username   string `json:"username"`
	Password   string `json:"password"`
	EthAddress string `json:"ethAddress"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Register(c *gin.Context) {
	var req registerRequest
	_ = c.ShouldBindJSON(&req)

	if req.Username == "" || req.Password == "" || req.EthAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "All fields are required."})
		return
	}

	user, err := services.RegisterUser(req.Username, req.Password, req.EthAddress)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully.",
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"ethAddress": user.EthAddress,
		},
	})
}

func Login(c *gin.Context) {
	var req loginRequest
	_ = c.ShouldBindJSON(&req)

	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username and password are required."})
		return
	}

	token, err := services.LoginUser(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}
