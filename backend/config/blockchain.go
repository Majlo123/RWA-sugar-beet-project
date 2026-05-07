package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

var (
	EthClient        *ethclient.Client
	TreasuryContract *bind.BoundContract
	Auth             *bind.TransactOpts
	ContractAddress  common.Address
	TreasuryABI      abi.ABI
)

func InitBlockchain() error {
	rpcURL := os.Getenv("SEPOLIA_RPC_URL")
	privateKeyHex := os.Getenv("SEPOLIA_PRIVATE_KEY")
	contractAddrHex := os.Getenv("TREASURY_CONTRACT_ADDRESS")

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return fmt.Errorf("dial RPC: %w", err)
	}

	abiBytes, err := os.ReadFile("treasury_abi.json")
	if err != nil {
		return fmt.Errorf("read ABI: %w", err)
	}

	parsedABI, err := abi.JSON(strings.NewReader(string(abiBytes)))
	if err != nil {
		return fmt.Errorf("parse ABI: %w", err)
	}

	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return fmt.Errorf("parse private key: %w", err)
	}

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return fmt.Errorf("get network ID: %w", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("create transactor: %w", err)
	}

	contractAddr := common.HexToAddress(contractAddrHex)
	contract := bind.NewBoundContract(contractAddr, parsedABI, client, client, client)

	EthClient = client
	TreasuryContract = contract
	Auth = auth
	ContractAddress = contractAddr
	TreasuryABI = parsedABI

	log.Printf("Povezan na Treasury ugovor na adresi: %s", contractAddrHex)
	return nil
}
