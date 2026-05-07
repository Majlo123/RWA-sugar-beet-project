package controllers

import (
	"log"
	"net/http"

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
		log.Printf("Greška pri dohvatanju cene tokena: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Došlo je do greške na serveru."})
		return
	}
	c.JSON(http.StatusOK, result)
}

func RecordInvestment(c *gin.Context) {
	var req recordInvestmentRequest
	_ = c.ShouldBindJSON(&req)

	if req.InvestorAddress == "" || req.AmountUSD == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Potrebno je uneti adresu investitora i iznos."})
		return
	}

	result, err := services.RecordNewInvestment(req.InvestorAddress, req.AmountUSD)
	if err != nil {
		log.Printf("Greška pri evidentiranju investicije: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Došlo je do greške na serveru."})
		return
	}
	c.JSON(http.StatusOK, result)
}
