package repositories

import (
	"context"
	"fmt"
	"math/big"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

func GetTokenPrice() (*big.Int, error) {
	out := []interface{}{new(*big.Int)}
	err := config.TreasuryContract.Call(&bind.CallOpts{Context: context.Background()}, &out, "TOKEN_PRICE_USD")
	if err != nil {
		return nil, fmt.Errorf("call TOKEN_PRICE_USD: %w", err)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("empty response from contract")
	}
	pricePtr, ok := out[0].(**big.Int)
	if !ok {
		return nil, fmt.Errorf("unexpected return type from TOKEN_PRICE_USD")
	}
	return *pricePtr, nil
}

func CreateInvestment(investorAddress string, amountUSD *big.Int) (*types.Transaction, error) {
	tx, err := config.TreasuryContract.Transact(
		config.Auth,
		"recordInvestment",
		common.HexToAddress(investorAddress),
		amountUSD,
	)
	if err != nil {
		return nil, err
	}
	if _, err := bind.WaitMined(context.Background(), config.EthClient, tx); err != nil {
		return nil, fmt.Errorf("wait for tx: %w", err)
	}
	return tx, nil
}
