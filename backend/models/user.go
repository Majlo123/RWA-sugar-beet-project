package models

import "time"

type User struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Username   string    `gorm:"uniqueIndex;not null" json:"username"`
	Password   string    `gorm:"not null" json:"-"`
	EthAddress string    `gorm:"uniqueIndex;not null;column:ethAddress" json:"ethAddress"`
	Role       string    `gorm:"default:user" json:"role"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (User) TableName() string {
	return "Users"
}
