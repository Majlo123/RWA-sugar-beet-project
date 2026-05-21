package services

import (
	"errors"
	"fmt"
	"log"
	"math/big"

	"github.com/Majlo123/sugar-beet-backend/repositories"
)

var ErrInvestmentValidation = errors.New("investment validation error")

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
		return nil, fmt.Errorf("%w: Investment amount must be a multiple of 1000.", ErrInvestmentValidation)
	}

	user, err := repositories.FindUserByEthAddress(investorAddress)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: Investor address is not registered in the system.", ErrInvestmentValidation)
	}
	if user.KYCStatus != KYCStatusVerified {
		status := user.KYCStatus
		if status == "" {
			status = KYCStatusNone
		}
		return nil, fmt.Errorf("%w: Investor has not completed KYC verification (current status: %s).", ErrInvestmentValidation, status)
	}

	log.Printf(
		"Starting transaction to record investment for %s, amount %d USD...",
		investorAddress, amountUSD,
	)

	tx, err := repositories.CreateInvestment(investorAddress, big.NewInt(amountUSD))
	if err != nil {
		return nil, err
	}

	txHash := tx.Hash().Hex()
	log.Printf("Transaction successful. Hash: %s", txHash)
	return &RecordInvestmentResponse{Success: true, TxHash: txHash}, nil
}
