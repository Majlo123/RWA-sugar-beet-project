package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Majlo123/sugar-beet-backend/models"
	"github.com/Majlo123/sugar-beet-backend/repositories"
)

var ErrPaymentValidation = errors.New("payment validation error")

var allowedPaymentMethods = map[string]bool{
	models.PaymentMethodBank:   true,
	models.PaymentMethodCard:   true,
	models.PaymentMethodPayPal: true,
	models.PaymentMethodCrypto: true,
	models.PaymentMethodQR:     true,
}

type InitiatePaymentResult struct {
	PaymentID       uint   `json:"paymentId"`
	MerchantOrderID string `json:"merchantOrderId"`
	RedirectPath    string `json:"redirectPath"`
	// External indicates whether RedirectPath is a fully-qualified external URL
	// (e.g. PayPal sandbox) that the frontend must navigate to via
	// window.location, rather than a React route.
	External      bool   `json:"external"`
	Status        string `json:"status"`
	AmountUSD     int64  `json:"amountUSD"`
	PaymentMethod string `json:"paymentMethod"`
}

type ConfirmPaymentResult struct {
	PaymentID     uint   `json:"paymentId"`
	Status        string `json:"status"`
	TxHash        string `json:"txHash,omitempty"`
	FailureReason string `json:"failureReason,omitempty"`
}

func beetPublicURL() string {
	if url := os.Getenv("BEET_FRONTEND_URL"); url != "" {
		return url
	}
	return "http://localhost:5173"
}

func generateMerchantOrderID() (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "beet-" + time.Now().UTC().Format("20060102150405") + "-" + hex.EncodeToString(buf), nil
}

func redirectPathForMethod(paymentID uint, method string) string {
	switch method {
	case models.PaymentMethodBank, models.PaymentMethodCard:
		return fmt.Sprintf("/payments/%d/bank", paymentID)
	case models.PaymentMethodPayPal:
		return fmt.Sprintf("/payments/%d/paypal", paymentID)
	case models.PaymentMethodCrypto:
		return fmt.Sprintf("/payments/%d/crypto", paymentID)
	case models.PaymentMethodQR:
		return fmt.Sprintf("/payments/%d/qr", paymentID)
	default:
		return fmt.Sprintf("/payments/%d", paymentID)
	}
}

// InitiatePayment creates a Payment row, calls the PSP to create a corresponding
// transaction, and returns the redirect path the frontend should send the user to.
func InitiatePayment(userID uint, amountUSD int64, method string) (*InitiatePaymentResult, error) {
	method = strings.ToUpper(strings.TrimSpace(method))
	if !allowedPaymentMethods[method] {
		return nil, fmt.Errorf("%w: unsupported payment method %q", ErrPaymentValidation, method)
	}
	if amountUSD <= 0 || amountUSD%1000 != 0 {
		return nil, fmt.Errorf("%w: amount must be a positive multiple of 1000 USD", ErrPaymentValidation)
	}

	user, err := repositories.FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("%w: user not found", ErrPaymentValidation)
	}
	if user.KYCStatus != KYCStatusVerified {
		return nil, fmt.Errorf("%w: KYC must be verified before purchasing tokens (current: %s)", ErrPaymentValidation, user.KYCStatus)
	}
	if strings.TrimSpace(user.EthAddress) == "" {
		return nil, fmt.Errorf("%w: user has no Ethereum address on file", ErrPaymentValidation)
	}

	orderID, err := generateMerchantOrderID()
	if err != nil {
		return nil, fmt.Errorf("generate order id: %w", err)
	}

	payment := &models.Payment{
		UserID:          userID,
		MerchantOrderID: orderID,
		AmountUSD:       amountUSD,
		PaymentMethod:   method,
		Status:          models.PaymentStatusPending,
	}
	if err := repositories.CreatePayment(payment); err != nil {
		return nil, fmt.Errorf("create payment: %w", err)
	}

	successURL := fmt.Sprintf("%s/payment-success?paymentId=%d", beetPublicURL(), payment.ID)
	failedURL := fmt.Sprintf("%s/payment-failed?paymentId=%d", beetPublicURL(), payment.ID)

	pspResp, err := repositories.PSPInitiateTransaction(
		float64(amountUSD),
		method,
		orderID,
		successURL,
		failedURL,
	)
	if err != nil {
		payment.Status = models.PaymentStatusFailed
		payment.FailureReason = "PSP_INITIATE_FAILED: " + err.Error()
		if saveErr := repositories.SavePayment(payment); saveErr != nil {
			log.Printf("payment.go: failed to mark payment %d as failed: %v", payment.ID, saveErr)
		}
		return nil, fmt.Errorf("PSP initiate failed: %w", err)
	}

	pspID := pspResp.PSPTransactionID
	payment.PSPTransactionID = &pspID
	if err := repositories.SavePayment(payment); err != nil {
		log.Printf("payment.go: failed to save PSP transaction id for payment %d: %v", payment.ID, err)
	}

	redirectPath := redirectPathForMethod(payment.ID, method)
	external := false

	// For PayPal, replace our internal page with the real PayPal sandbox
	// approvalUrl. Frontend will do window.location.href to send the user
	// off to sandbox.paypal.com.
	if method == models.PaymentMethodPayPal {
		ppResp, ppErr := repositories.PSPCreatePayPalPayment(pspID, orderID, float64(amountUSD))
		if ppErr != nil {
			payment.Status = models.PaymentStatusFailed
			payment.FailureReason = "PAYPAL_CREATE_FAILED: " + ppErr.Error()
			if saveErr := repositories.SavePayment(payment); saveErr != nil {
				log.Printf("payment.go: failed to mark payment %d as failed: %v", payment.ID, saveErr)
			}
			return nil, fmt.Errorf("PayPal create failed: %w", ppErr)
		}
		redirectPath = ppResp.ApprovalURL
		external = true
	}

	return &InitiatePaymentResult{
		PaymentID:       payment.ID,
		MerchantOrderID: orderID,
		RedirectPath:    redirectPath,
		External:        external,
		Status:          payment.Status,
		AmountUSD:       payment.AmountUSD,
		PaymentMethod:   payment.PaymentMethod,
	}, nil
}

// ConfirmPayment is called by the frontend after the user is redirected back
// from the PSP. It queries the PSP for the latest status, and if PAID,
// triggers an on-chain mint via RecordNewInvestment.
func ConfirmPayment(paymentID, userID uint) (*ConfirmPaymentResult, error) {
	payment, err := repositories.FindPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}
	if payment == nil {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.UserID != userID {
		return nil, fmt.Errorf("%w: payment does not belong to user", ErrPaymentValidation)
	}

	// Already finalized.
	if payment.Status == models.PaymentStatusMinted ||
		payment.Status == models.PaymentStatusFailed ||
		payment.Status == models.PaymentStatusExpired ||
		payment.Status == models.PaymentStatusMintFailed {
		return resultFromPayment(payment), nil
	}

	if payment.PSPTransactionID == nil {
		payment.Status = models.PaymentStatusFailed
		payment.FailureReason = "NO_PSP_TRANSACTION_ID"
		_ = repositories.SavePayment(payment)
		return resultFromPayment(payment), nil
	}

	pspStatus, err := repositories.PSPGetTransactionStatus(*payment.PSPTransactionID)
	if err != nil {
		return nil, fmt.Errorf("query PSP: %w", err)
	}

	switch strings.ToUpper(pspStatus.Status) {
	case "PAID":
		if err := finalizeMint(payment); err != nil {
			return nil, err
		}
	case "FAILED", "ERROR":
		payment.Status = models.PaymentStatusFailed
		payment.FailureReason = pspStatus.Reason
		if err := repositories.SavePayment(payment); err != nil {
			return nil, err
		}
	default:
		// Still CREATED/PENDING on PSP side — nothing to do, return current state.
	}

	return resultFromPayment(payment), nil
}

// finalizeMint records the on-chain investment and updates the payment row.
// On mint failure the payment is marked MINT_FAILED so it can be retried.
func finalizeMint(payment *models.Payment) error {
	user, err := repositories.FindUserByID(payment.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		payment.Status = models.PaymentStatusMintFailed
		payment.FailureReason = "USER_NOT_FOUND"
		return repositories.SavePayment(payment)
	}

	log.Printf("payment %d marked PAID by PSP, minting %d USD worth of BEET to %s",
		payment.ID, payment.AmountUSD, user.EthAddress)

	mintResult, mintErr := RecordNewInvestment(user.EthAddress, payment.AmountUSD)
	if mintErr != nil {
		log.Printf("payment %d: mint failed: %v", payment.ID, mintErr)
		payment.Status = models.PaymentStatusMintFailed
		payment.FailureReason = "MINT_FAILED: " + mintErr.Error()
		return repositories.SavePayment(payment)
	}

	payment.Status = models.PaymentStatusMinted
	payment.TxHash = mintResult.TxHash
	payment.FailureReason = ""
	return repositories.SavePayment(payment)
}

func resultFromPayment(p *models.Payment) *ConfirmPaymentResult {
	return &ConfirmPaymentResult{
		PaymentID:     p.ID,
		Status:        p.Status,
		TxHash:        p.TxHash,
		FailureReason: p.FailureReason,
	}
}

// CapturePayPalPayment is called after PayPal redirects the user back from
// the sandbox approval flow. The caller passes the PayPal-issued `token`
// (the order id) and `PayerID`. We look up the BEET payment row by
// merchantOrderId, call paypal-service to capture the funds, and then run
// the normal confirm flow that mints tokens on success.
func CapturePayPalPayment(userID uint, merchantOrderID, paypalOrderID, payerID string) (*ConfirmPaymentResult, error) {
	payment, err := repositories.FindPaymentByMerchantOrderID(merchantOrderID)
	if err != nil {
		return nil, err
	}
	if payment == nil || payment.UserID != userID {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.Status != models.PaymentStatusPending {
		return resultFromPayment(payment), nil
	}

	if err := repositories.PSPCapturePayPalPayment(paypalOrderID, payerID, merchantOrderID); err != nil {
		payment.Status = models.PaymentStatusFailed
		payment.FailureReason = "PAYPAL_CAPTURE_FAILED: " + err.Error()
		_ = repositories.SavePayment(payment)
		return nil, fmt.Errorf("PayPal capture failed: %w", err)
	}

	return ConfirmPayment(payment.ID, userID)
}

// CancelPayPalPayment is called when the user clicks "Cancel" on the PayPal
// sandbox page and is redirected back. We mark the payment as FAILED.
func CancelPayPalPayment(userID uint, merchantOrderID string) error {
	payment, err := repositories.FindPaymentByMerchantOrderID(merchantOrderID)
	if err != nil {
		return err
	}
	if payment == nil || payment.UserID != userID {
		return fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.Status != models.PaymentStatusPending {
		return nil
	}
	payment.Status = models.PaymentStatusFailed
	payment.FailureReason = "USER_CANCELLED"
	return repositories.SavePayment(payment)
}

// SimulatePayment tells the PSP that this payment was paid (or failed)
// via the simulated method (PayPal/Crypto/QR). Called by the user from
// the corresponding payment page after clicking the simulated CTA.
// All PSP communication happens server-to-server so the browser does not
// need to talk to the PSP gateway (avoids CORS, mirrors production).
func SimulatePayment(paymentID, userID uint, status, reason string) (*ConfirmPaymentResult, error) {
	payment, err := repositories.FindPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}
	if payment == nil || payment.UserID != userID {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.Status != models.PaymentStatusPending {
		return resultFromPayment(payment), nil
	}

	upper := strings.ToUpper(status)
	if upper != "PAID" && upper != "FAILED" {
		return nil, fmt.Errorf("%w: status must be PAID or FAILED", ErrPaymentValidation)
	}

	if err := repositories.PSPUpdateStatus(payment.MerchantOrderID, upper, reason); err != nil {
		return nil, fmt.Errorf("PSP update-status failed: %w", err)
	}

	// Re-use the confirm flow which queries PSP and mints if PAID.
	return ConfirmPayment(paymentID, userID)
}

// GetPaymentQRCode returns the NBS IPS QR code (base64 PNG + IPS string) for a
// QR payment, generated by the PSP core-service. The mobile banking app scans
// this QR to confirm the payment on the PSP side.
func GetPaymentQRCode(paymentID, userID uint) (*repositories.PSPQRCodeResponse, error) {
	payment, err := repositories.FindPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}
	if payment == nil || payment.UserID != userID {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.PaymentMethod != models.PaymentMethodQR {
		return nil, fmt.Errorf("%w: payment is not a QR payment", ErrPaymentValidation)
	}
	if payment.PSPTransactionID == nil {
		return nil, fmt.Errorf("%w: payment has no PSP transaction", ErrPaymentValidation)
	}
	return repositories.PSPGenerateQRCode(*payment.PSPTransactionID)
}

// SubmitBankPayment proxies the card form to bank-service and then runs the
// regular confirm flow. The browser never talks to the PSP directly.
func SubmitBankPayment(paymentID, userID uint, pan, cvv, expiryDate, cardHolder string) (*ConfirmPaymentResult, error) {
	payment, err := repositories.FindPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}
	if payment == nil || payment.UserID != userID {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	if payment.Status != models.PaymentStatusPending {
		return resultFromPayment(payment), nil
	}

	_, bankErr := repositories.PSPSubmitBankPayment(repositories.PSPBankPaymentRequest{
		PAN:             pan,
		CVV:             cvv,
		ExpiryDate:      expiryDate,
		CardHolder:      cardHolder,
		Amount:          float64(payment.AmountUSD),
		MerchantOrderID: payment.MerchantOrderID,
	})
	// bank-service updates PSP status itself; whether it returned 200 or 4xx we
	// still call confirm to read the resulting status from PSP.
	confirmResult, confirmErr := ConfirmPayment(paymentID, userID)
	if confirmErr != nil {
		return nil, confirmErr
	}
	if bankErr != nil && confirmResult.Status == models.PaymentStatusPending {
		// bank-service failed before even reaching PSP — surface the error.
		return nil, fmt.Errorf("bank submission failed: %w", bankErr)
	}
	return confirmResult, nil
}

// GetUserPayments returns payment history for a user, most recent first.
func GetUserPayments(userID uint) ([]models.Payment, error) {
	return repositories.GetPaymentsByUserID(userID)
}

// GetUserPaymentByID fetches one payment and ensures it belongs to the caller.
func GetUserPaymentByID(userID, paymentID uint) (*models.Payment, error) {
	p, err := repositories.FindPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}
	if p == nil || p.UserID != userID {
		return nil, fmt.Errorf("%w: payment not found", ErrPaymentValidation)
	}
	return p, nil
}

// SweepOrphanedPayments scans PENDING payments older than the cutoff and
// reconciles their status with the PSP. Designed to be called on a timer.
func SweepOrphanedPayments(olderThan time.Duration) {
	cutoff := time.Now().Add(-olderThan)
	payments, err := repositories.GetPendingPaymentsOlderThan(cutoff)
	if err != nil {
		log.Printf("sweeper: query failed: %v", err)
		return
	}
	if len(payments) == 0 {
		return
	}
	log.Printf("sweeper: reconciling %d orphaned payment(s)", len(payments))

	for i := range payments {
		p := &payments[i]
		if p.PSPTransactionID == nil {
			p.Status = models.PaymentStatusExpired
			p.FailureReason = "NO_PSP_TRANSACTION_ID"
			_ = repositories.SavePayment(p)
			continue
		}

		pspStatus, err := repositories.PSPGetTransactionStatus(*p.PSPTransactionID)
		if err != nil {
			log.Printf("sweeper: PSP query failed for payment %d: %v", p.ID, err)
			continue
		}

		switch strings.ToUpper(pspStatus.Status) {
		case "PAID":
			if err := finalizeMint(p); err != nil {
				log.Printf("sweeper: finalizeMint failed for payment %d: %v", p.ID, err)
			}
		case "FAILED", "ERROR":
			p.Status = models.PaymentStatusFailed
			p.FailureReason = pspStatus.Reason
			_ = repositories.SavePayment(p)
		default:
			// PSP still says CREATED — payment was abandoned by user.
			// Mark EXPIRED so we don't keep polling forever.
			p.Status = models.PaymentStatusExpired
			p.FailureReason = "USER_ABANDONED"
			_ = repositories.SavePayment(p)
		}
	}
}
