package config

import (
	"log"

	"github.com/Majlo123/sugar-beet-backend/models"
	"golang.org/x/crypto/bcrypt"
)

func SeedDatabase() error {
	if err := seedUser("admin", "lozinka123", "0xEE7c91Cd6CcbD5ba5693A2850e7D0D992E666e92", "admin"); err != nil {
		return err
	}
	if err := seedUser("test", "123", "0xD56e1a28e1Db781EeA0D80d2dfb43f8E97F279B7", "user"); err != nil {
		return err
	}
	return nil
}

func seedUser(username, password, ethAddress, role string) error {
	var count int64
	if err := DB.Model(&models.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return err
	}

	user := &models.User{
		Username:   username,
		Password:   string(hashed),
		EthAddress: ethAddress,
		Role:       role,
	}
	if err := DB.Create(user).Error; err != nil {
		return err
	}
	log.Printf("✓ %s account created: %s", role, username)
	return nil
}
