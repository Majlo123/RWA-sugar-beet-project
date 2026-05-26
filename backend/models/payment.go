package models

import "time"

const (
	PaymentStatusPending    = "PENDING"
	PaymentStatusPaid       = "PAID"
	PaymentStatusFailed     = "FAILED"
	PaymentStatusMinted     = "MINTED"
	PaymentStatusMintFailed = "MINT_FAILED"
	PaymentStatusExpired    = "EXPIRED"

	PaymentMethodBank   = "BANK"
	PaymentMethodCard   = "CARD"
	PaymentMethodPayPal = "PAYPAL"
	PaymentMethodCrypto = "CRYPTO"
	PaymentMethodQR     = "QR"
)

type Payment struct {
	ID               uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID           uint   `gorm:"not null;index;column:user_id" json:"userId"`
	MerchantOrderID  string `gorm:"uniqueIndex;not null;column:merchant_order_id" json:"merchantOrderId"`
	AmountUSD        int64  `gorm:"not null;column:amount_usd" json:"amountUSD"`
	PaymentMethod    string `gorm:"not null;column:payment_method" json:"paymentMethod"`
	Status           string `gorm:"not null;default:'PENDING';index;column:status" json:"status"`
	PSPTransactionID *int64 `gorm:"column:psp_transaction_id" json:"pspTransactionId,omitempty"`
	TxHash           string `gorm:"column:tx_hash" json:"txHash,omitempty"`
	FailureReason    string `gorm:"column:failure_reason" json:"failureReason,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (Payment) TableName() string {
	return "payments"
}
