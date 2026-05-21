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

	KYCStatus          string     `gorm:"column:kyc_status;default:'none'" json:"kycStatus"`
	KYCFullName        string     `gorm:"column:kyc_full_name" json:"kycFullName,omitempty"`
	KYCDocumentType    string     `gorm:"column:kyc_document_type" json:"kycDocumentType,omitempty"`
	KYCDocumentNumber  string     `gorm:"column:kyc_document_number" json:"kycDocumentNumber,omitempty"`
	KYCDateOfBirth     string     `gorm:"column:kyc_date_of_birth" json:"kycDateOfBirth,omitempty"`
	KYCCountry         string     `gorm:"column:kyc_country" json:"kycCountry,omitempty"`
	KYCDocumentPath    string     `gorm:"column:kyc_document_path" json:"-"`
	KYCSubmittedAt     *time.Time `gorm:"column:kyc_submitted_at" json:"kycSubmittedAt,omitempty"`
	KYCReviewedAt      *time.Time `gorm:"column:kyc_reviewed_at" json:"kycReviewedAt,omitempty"`
	KYCRejectionReason string     `gorm:"column:kyc_rejection_reason" json:"kycRejectionReason,omitempty"`
}

func (User) TableName() string {
	return "Users"
}
