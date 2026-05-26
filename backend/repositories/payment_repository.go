package repositories

import (
	"errors"
	"time"

	"github.com/Majlo123/sugar-beet-backend/config"
	"github.com/Majlo123/sugar-beet-backend/models"
	"gorm.io/gorm"
)

func CreatePayment(p *models.Payment) error {
	return config.DB.Create(p).Error
}

func SavePayment(p *models.Payment) error {
	return config.DB.Save(p).Error
}

func FindPaymentByID(id uint) (*models.Payment, error) {
	var p models.Payment
	err := config.DB.First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func FindPaymentByMerchantOrderID(orderID string) (*models.Payment, error) {
	var p models.Payment
	err := config.DB.Where("merchant_order_id = ?", orderID).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func GetPaymentsByUserID(userID uint) ([]models.Payment, error) {
	var payments []models.Payment
	if err := config.DB.Where("user_id = ?", userID).Order("id DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

// GetPendingPaymentsOlderThan returns payments still in PENDING status older than the given cutoff.
// Used by the sweeper to detect orphaned payments (user closed browser, never reached success page).
func GetPendingPaymentsOlderThan(cutoff time.Time) ([]models.Payment, error) {
	var payments []models.Payment
	err := config.DB.
		Where("status = ? AND created_at < ?", models.PaymentStatusPending, cutoff).
		Find(&payments).Error
	if err != nil {
		return nil, err
	}
	return payments, nil
}
