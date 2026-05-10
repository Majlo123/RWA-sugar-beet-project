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

type Investment struct {
	ID         *big.Int
	Investor   common.Address
	AmountUSD  *big.Int
	StartTime  *big.Int
	MaturesOn  *big.Int
	IsClaimed  bool
}

func GetInvestmentIdsForInvestor(investor string) ([]*big.Int, error) {
	out := []interface{}{new([]*big.Int)}
	err := config.TreasuryContract.Call(
		&bind.CallOpts{Context: context.Background()},
		&out,
		"getInvestmentIdsForInvestor",
		common.HexToAddress(investor),
	)
	if err != nil {
		return nil, fmt.Errorf("call getInvestmentIdsForInvestor: %w", err)
	}
	idsPtr, ok := out[0].(*[]*big.Int)
	if !ok {
		return nil, fmt.Errorf("unexpected return type from getInvestmentIdsForInvestor")
	}
	return *idsPtr, nil
}

func GetInvestmentByID(id *big.Int) (*Investment, error) {
	out := []interface{}{}
	err := config.TreasuryContract.Call(
		&bind.CallOpts{Context: context.Background()},
		&out,
		"investments",
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("call investments(%s): %w", id.String(), err)
	}
	if len(out) != 5 {
		return nil, fmt.Errorf("call investments(%s): expected 5 outputs, got %d", id.String(), len(out))
	}
	investor, ok1 := out[0].(common.Address)
	amount, ok2 := out[1].(*big.Int)
	startTime, ok3 := out[2].(*big.Int)
	maturesOn, ok4 := out[3].(*big.Int)
	isClaimed, ok5 := out[4].(bool)
	if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
		return nil, fmt.Errorf("call investments(%s): unexpected output types", id.String())
	}

	return &Investment{
		ID:        new(big.Int).Set(id),
		Investor:  investor,
		AmountUSD: amount,
		StartTime: startTime,
		MaturesOn: maturesOn,
		IsClaimed: isClaimed,
	}, nil
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
