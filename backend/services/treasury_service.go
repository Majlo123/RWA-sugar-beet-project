package services

import (
	"errors"
	"log"
	"math/big"

	"github.com/Majlo123/sugar-beet-backend/repositories"
)

type TokenPriceResponse struct {
	TokenPriceUSD string `json:"tokenPriceUSD"`
}

type RecordInvestmentResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"txHash"`
}

func FetchTokenPrice() (*TokenPriceResponse, error) {
	price, err := repositories.GetTokenPrice()
	if err != nil {
		return nil, err
	}
	return &TokenPriceResponse{TokenPriceUSD: price.String()}, nil
}

func RecordNewInvestment(investorAddress string, amountUSD int64) (*RecordInvestmentResponse, error) {
	if amountUSD%1000 != 0 {
		return nil, errors.New("Investment amount must be a multiple of 1000.")
	}

	log.Printf(
		"Započinjem transakciju za evidentiranje investicije za %s u iznosu od %d USD...",
		investorAddress, amountUSD,
	)

	tx, err := repositories.CreateInvestment(investorAddress, big.NewInt(amountUSD))
	if err != nil {
		return nil, err
	}

	txHash := tx.Hash().Hex()
	log.Printf("Transakcija uspešna! Hash: %s", txHash)
	return &RecordInvestmentResponse{Success: true, TxHash: txHash}, nil
}
