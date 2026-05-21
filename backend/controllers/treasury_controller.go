package controllers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

type recordInvestmentRequest struct {
	InvestorAddress string `json:"investorAddress"`
	AmountUSD       int64  `json:"amountUSD"`
}

func GetTokenPrice(c *gin.Context) {
	result, err := services.FetchTokenPrice()
	if err != nil {
		log.Printf("Error fetching token price: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}

func RecordInvestment(c *gin.Context) {
	var req recordInvestmentRequest
	_ = c.ShouldBindJSON(&req)

	if req.InvestorAddress == "" || req.AmountUSD == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Investor address and amount are required."})
		return
	}

	result, err := services.RecordNewInvestment(req.InvestorAddress, req.AmountUSD)
	if err != nil {
		log.Printf("Error recording investment: %v", err)
		if errors.Is(err, services.ErrInvestmentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrInvestmentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}
