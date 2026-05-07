package services

import (
	"errors"
	"os"
	"time"

	"github.com/Majlo123/sugar-beet-backend/models"
	"github.com/Majlo123/sugar-beet-backend/repositories"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type CustomClaims struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func RegisterUser(username, password, ethAddress string) (*models.User, error) {
	existing, err := repositories.FindUserByUsername(username)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("Username is already taken.")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:   username,
		Password:   string(hashed),
		EthAddress: ethAddress,
		Role:       "user",
	}
	if err := repositories.CreateUser(user); err != nil {
		return nil, err
	}
	return user, nil
}

func LoginUser(username, password string) (string, error) {
	user, err := repositories.FindUserByUsername(username)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", errors.New("User not found.")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", errors.New("Incorrect password.")
	}

	claims := CustomClaims{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}
	return signed, nil
}
