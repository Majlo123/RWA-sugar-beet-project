package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/Majlo123/sugar-beet-backend/repositories"
)

type AnalyticsSummary struct {
	TotalUsers            int   `json:"totalUsers"`
	TotalInvestments      int   `json:"totalInvestments"`
	UniqueInvestors       int   `json:"uniqueInvestors"`
	TotalUSDInvested      int64 `json:"totalUSDInvested"`
	TotalBEETMinted       int64 `json:"totalBEETMinted"`
	ClaimedCount          int   `json:"claimedCount"`
	MaturedUnclaimedCount int   `json:"maturedUnclaimedCount"`
	PendingCount          int   `json:"pendingCount"`
}

type InvestmentRecord struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	EthAddress string `json:"ethAddress"`
	AmountUSD  int64  `json:"amountUSD"`
	StartTime  int64  `json:"startTime"`
	MaturesOn  int64  `json:"maturesOn"`
	IsClaimed  bool   `json:"isClaimed"`
	IsMatured  bool   `json:"isMatured"`
}

type UserRecord struct {
	ID              uint   `json:"id"`
	Username        string `json:"username"`
	EthAddress      string `json:"ethAddress"`
	Role            string `json:"role"`
	CreatedAt       string `json:"createdAt"`
	InvestmentCount int    `json:"investmentCount"`
	TotalInvested   int64  `json:"totalInvested"`
}

type AnalyticsResponse struct {
	Summary     AnalyticsSummary    `json:"summary"`
	Investments []InvestmentRecord  `json:"investments"`
	Users       []UserRecord        `json:"users"`
}

func GetAdminAnalytics() (*AnalyticsResponse, error) {
	if config.TreasuryContract == nil {
		return nil, fmt.Errorf("blockchain not connected — restart the server and check POLYGON_RPC_URL")
	}

	users, err := repositories.GetAllUsers()
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	resp := &AnalyticsResponse{
		Investments: []InvestmentRecord{},
		Users:       []UserRecord{},
	}
	uniqueInvestors := make(map[string]struct{})

	for _, u := range users {
		userRec := UserRecord{
			ID:         u.ID,
			Username:   u.Username,
			EthAddress: u.EthAddress,
			Role:       u.Role,
			CreatedAt:  u.CreatedAt.Format(time.RFC3339),
		}

		ids, err := repositories.GetInvestmentIdsForInvestor(u.EthAddress)
		if err != nil {
			return nil, err
		}

		if len(ids) > 0 {
			uniqueInvestors[strings.ToLower(u.EthAddress)] = struct{}{}
		}

		for _, id := range ids {
			inv, err := repositories.GetInvestmentByID(id)
			if err != nil {
				return nil, err
			}

			amount := inv.AmountUSD.Int64()
			matures := inv.MaturesOn.Int64()
			isMatured := now >= matures

			resp.Investments = append(resp.Investments, InvestmentRecord{
				ID:         inv.ID.String(),
				Username:   u.Username,
				EthAddress: u.EthAddress,
				AmountUSD:  amount,
				StartTime:  inv.StartTime.Int64(),
				MaturesOn:  matures,
				IsClaimed:  inv.IsClaimed,
				IsMatured:  isMatured,
			})

			userRec.InvestmentCount++
			userRec.TotalInvested += amount
			resp.Summary.TotalUSDInvested += amount

			switch {
			case inv.IsClaimed:
				resp.Summary.ClaimedCount++
			case isMatured:
				resp.Summary.MaturedUnclaimedCount++
			default:
				resp.Summary.PendingCount++
			}
		}

		resp.Users = append(resp.Users, userRec)
	}

	resp.Summary.TotalUsers = len(users)
	resp.Summary.TotalInvestments = len(resp.Investments)
	resp.Summary.UniqueInvestors = len(uniqueInvestors)
	resp.Summary.TotalBEETMinted = resp.Summary.TotalUSDInvested / 1000

	return resp, nil
}
