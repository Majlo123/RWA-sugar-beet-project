package repositories

import (
	"errors"
	"strings"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/Majlo123/sugar-beet-backend/models"
	"gorm.io/gorm"
)

func FindUserByUsername(username string) (*models.User, error) {
	var user models.User
	err := config.DB.Where("username = ?", username).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func FindUserByID(id uint) (*models.User, error) {
	var user models.User
	err := config.DB.First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func FindUserByEthAddress(addr string) (*models.User, error) {
	var user models.User
	err := config.DB.Where(`LOWER("ethAddress") = ?`, strings.ToLower(addr)).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func CreateUser(user *models.User) error {
	return config.DB.Create(user).Error
}

func SaveUser(user *models.User) error {
	return config.DB.Save(user).Error
}

func GetAllUsers() ([]models.User, error) {
	var users []models.User
	if err := config.DB.Order("id ASC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func GetUsersByKYCStatus(status string) ([]models.User, error) {
	var users []models.User
	q := config.DB.Order("kyc_submitted_at DESC NULLS LAST, id ASC")
	if status != "" {
		q = q.Where("kyc_status = ?", status)
	}
	if err := q.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}
