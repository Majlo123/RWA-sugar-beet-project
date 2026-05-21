package services

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Majlo123/sugar-beet-backend/models"
	"github.com/Majlo123/sugar-beet-backend/repositories"
)

const (
	KYCStatusNone     = "none"
	KYCStatusPending  = "pending"
	KYCStatusVerified = "verified"
	KYCStatusRejected = "rejected"

	KYCUploadDir   = "uploads/kyc"
	KYCMaxFileSize = 5 * 1024 * 1024 // 5 MiB
)

var allowedKYCExtensions = map[string]struct{}{
	".pdf":  {},
	".jpg":  {},
	".jpeg": {},
	".png":  {},
}

type KYCSubmitInput struct {
	FullName       string
	DocumentType   string
	DocumentNumber string
	DateOfBirth    string
	Country        string
}

type KYCStatusResponse struct {
	Status          string     `json:"status"`
	FullName        string     `json:"fullName,omitempty"`
	DocumentType    string     `json:"documentType,omitempty"`
	DocumentNumber  string     `json:"documentNumber,omitempty"`
	DateOfBirth     string     `json:"dateOfBirth,omitempty"`
	Country         string     `json:"country,omitempty"`
	HasDocument     bool       `json:"hasDocument"`
	SubmittedAt     *time.Time `json:"submittedAt,omitempty"`
	ReviewedAt      *time.Time `json:"reviewedAt,omitempty"`
	RejectionReason string     `json:"rejectionReason,omitempty"`
}

type KYCListItem struct {
	UserID          uint       `json:"userId"`
	Username        string     `json:"username"`
	EthAddress      string     `json:"ethAddress"`
	Status          string     `json:"status"`
	FullName        string     `json:"fullName,omitempty"`
	DocumentType    string     `json:"documentType,omitempty"`
	DocumentNumber  string     `json:"documentNumber,omitempty"`
	DateOfBirth     string     `json:"dateOfBirth,omitempty"`
	Country         string     `json:"country,omitempty"`
	HasDocument     bool       `json:"hasDocument"`
	SubmittedAt     *time.Time `json:"submittedAt,omitempty"`
	ReviewedAt      *time.Time `json:"reviewedAt,omitempty"`
	RejectionReason string     `json:"rejectionReason,omitempty"`
}

func toStatusResponse(u *models.User) *KYCStatusResponse {
	status := u.KYCStatus
	if status == "" {
		status = KYCStatusNone
	}
	return &KYCStatusResponse{
		Status:          status,
		FullName:        u.KYCFullName,
		DocumentType:    u.KYCDocumentType,
		DocumentNumber:  u.KYCDocumentNumber,
		DateOfBirth:     u.KYCDateOfBirth,
		Country:         u.KYCCountry,
		HasDocument:     u.KYCDocumentPath != "",
		SubmittedAt:     u.KYCSubmittedAt,
		ReviewedAt:      u.KYCReviewedAt,
		RejectionReason: u.KYCRejectionReason,
	}
}

func validateInput(in KYCSubmitInput) error {
	if strings.TrimSpace(in.FullName) == "" {
		return errors.New("Full name is required.")
	}
	if in.DocumentType != "id_card" && in.DocumentType != "passport" {
		return errors.New("Document type must be 'id_card' or 'passport'.")
	}
	if strings.TrimSpace(in.DocumentNumber) == "" {
		return errors.New("Document number is required.")
	}
	if strings.TrimSpace(in.DateOfBirth) == "" {
		return errors.New("Date of birth is required.")
	}
	if strings.TrimSpace(in.Country) == "" {
		return errors.New("Country is required.")
	}
	return nil
}

func saveKYCFile(userID uint, fh *multipart.FileHeader) (string, error) {
	if fh.Size > KYCMaxFileSize {
		return "", fmt.Errorf("File is too large (maximum %d MB).", KYCMaxFileSize/1024/1024)
	}

	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if _, ok := allowedKYCExtensions[ext]; !ok {
		return "", errors.New("Allowed formats: PDF, JPG, JPEG, PNG.")
	}

	if err := os.MkdirAll(KYCUploadDir, 0o755); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("user_%d_%d%s", userID, time.Now().Unix(), ext)
	dst := filepath.Join(KYCUploadDir, filename)

	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		_ = os.Remove(dst)
		return "", err
	}
	return dst, nil
}

func SubmitKYC(userID uint, in KYCSubmitInput, fh *multipart.FileHeader) (*KYCStatusResponse, error) {
	if err := validateInput(in); err != nil {
		return nil, err
	}
	if fh == nil {
		return nil, errors.New("A scanned copy of the document is required.")
	}

	user, err := repositories.FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("User not found.")
	}
	if user.Role == "admin" {
		return nil, errors.New("Admin accounts do not require KYC verification.")
	}
	if user.KYCStatus == KYCStatusPending {
		return nil, errors.New("You already have a pending KYC submission.")
	}
	if user.KYCStatus == KYCStatusVerified {
		return nil, errors.New("Your account is already verified.")
	}

	savedPath, err := saveKYCFile(userID, fh)
	if err != nil {
		return nil, err
	}

	if user.KYCDocumentPath != "" {
		_ = os.Remove(user.KYCDocumentPath)
	}

	now := time.Now()
	user.KYCStatus = KYCStatusPending
	user.KYCFullName = strings.TrimSpace(in.FullName)
	user.KYCDocumentType = in.DocumentType
	user.KYCDocumentNumber = strings.TrimSpace(in.DocumentNumber)
	user.KYCDateOfBirth = strings.TrimSpace(in.DateOfBirth)
	user.KYCCountry = strings.TrimSpace(in.Country)
	user.KYCDocumentPath = savedPath
	user.KYCSubmittedAt = &now
	user.KYCReviewedAt = nil
	user.KYCRejectionReason = ""

	if err := repositories.SaveUser(user); err != nil {
		_ = os.Remove(savedPath)
		return nil, err
	}
	return toStatusResponse(user), nil
}

func GetKYCStatusForUser(userID uint) (*KYCStatusResponse, error) {
	user, err := repositories.FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("User not found.")
	}
	return toStatusResponse(user), nil
}

func ListKYCSubmissions(status string) ([]KYCListItem, error) {
	if status != "" && status != KYCStatusNone && status != KYCStatusPending &&
		status != KYCStatusVerified && status != KYCStatusRejected {
		return nil, errors.New("Invalid status filter.")
	}

	users, err := repositories.GetUsersByKYCStatus(status)
	if err != nil {
		return nil, err
	}

	out := make([]KYCListItem, 0, len(users))
	for _, u := range users {
		s := u.KYCStatus
		if s == "" {
			s = KYCStatusNone
		}
		out = append(out, KYCListItem{
			UserID:          u.ID,
			Username:        u.Username,
			EthAddress:      u.EthAddress,
			Status:          s,
			FullName:        u.KYCFullName,
			DocumentType:    u.KYCDocumentType,
			DocumentNumber:  u.KYCDocumentNumber,
			DateOfBirth:     u.KYCDateOfBirth,
			Country:         u.KYCCountry,
			HasDocument:     u.KYCDocumentPath != "",
			SubmittedAt:     u.KYCSubmittedAt,
			ReviewedAt:      u.KYCReviewedAt,
			RejectionReason: u.KYCRejectionReason,
		})
	}
	return out, nil
}

func ApproveKYC(targetUserID uint) (*KYCStatusResponse, error) {
	user, err := repositories.FindUserByID(targetUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("User not found.")
	}
	if user.KYCStatus != KYCStatusPending {
		return nil, errors.New("Only submissions with status 'pending' can be approved.")
	}

	now := time.Now()
	user.KYCStatus = KYCStatusVerified
	user.KYCReviewedAt = &now
	user.KYCRejectionReason = ""

	if err := repositories.SaveUser(user); err != nil {
		return nil, err
	}
	return toStatusResponse(user), nil
}

func RejectKYC(targetUserID uint, reason string) (*KYCStatusResponse, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, errors.New("Rejection reason is required.")
	}

	user, err := repositories.FindUserByID(targetUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("User not found.")
	}
	if user.KYCStatus != KYCStatusPending {
		return nil, errors.New("Only submissions with status 'pending' can be rejected.")
	}

	now := time.Now()
	user.KYCStatus = KYCStatusRejected
	user.KYCReviewedAt = &now
	user.KYCRejectionReason = reason

	if err := repositories.SaveUser(user); err != nil {
		return nil, err
	}
	return toStatusResponse(user), nil
}

func GetKYCDocumentPathForUser(targetUserID uint) (string, error) {
	user, err := repositories.FindUserByID(targetUserID)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", errors.New("User not found.")
	}
	if user.KYCDocumentPath == "" {
		return "", errors.New("User has not submitted a document.")
	}
	return user.KYCDocumentPath, nil
}
