package repositories

import (
	"errors"

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

func CreateUser(user *models.User) error {
	return config.DB.Create(user).Error
}

func GetAllUsers() ([]models.User, error) {
	var users []models.User
	if err := config.DB.Order("id ASC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}
