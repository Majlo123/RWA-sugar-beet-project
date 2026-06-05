package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type PSPInitiateRequest struct {
	MerchantID        string  `json:"merchantId"`
	MerchantPassword  string  `json:"merchantPassword"`
	Amount            float64 `json:"amount"`
	Currency          string  `json:"currency"`
	MerchantOrderID   string  `json:"merchantOrderId"`
	MerchantTimestamp string  `json:"merchantTimestamp"`
	PaymentMethod     string  `json:"paymentMethod"`
	SuccessURL        string  `json:"successUrl"`
	FailedURL         string  `json:"failedUrl"`
	ErrorURL          string  `json:"errorUrl"`
}

type PSPInitiateResponse struct {
	PSPTransactionID int64  `json:"pspTransactionId"`
	PaymentURL       string `json:"paymentUrl"`
}

type PSPTransactionStatus struct {
	ID                  int64   `json:"id"`
	Status              string  `json:"status"`
	Amount              float64 `json:"amount"`
	Currency            string  `json:"currency"`
	PaymentMethod       string  `json:"paymentMethod"`
	Reason              string  `json:"reason"`
	GlobalTransactionID string  `json:"globalTransactionId"`
}

var pspHTTPClient = &http.Client{Timeout: 15 * time.Second}

func pspGatewayURL() string {
	url := os.Getenv("PSP_GATEWAY_URL")
	if url == "" {
		return "http://api-gateway:8080"
	}
	return url
}

func pspMerchantID() string {
	id := os.Getenv("PSP_MERCHANT_ID")
	if id == "" {
		return "beet-merchant"
	}
	return id
}

func pspMerchantPassword() string {
	p := os.Getenv("PSP_MERCHANT_PASSWORD")
	if p == "" {
		return "beet-secret"
	}
	return p
}

// PSPInitiateTransaction creates a new transaction in the PSP and returns
// the PSP transaction ID along with the relative URL the user should be
// redirected to.
func PSPInitiateTransaction(amount float64, method, orderID, successURL, failedURL string) (*PSPInitiateResponse, error) {
	reqBody := PSPInitiateRequest{
		MerchantID:        pspMerchantID(),
		MerchantPassword:  pspMerchantPassword(),
		Amount:            amount,
		Currency:          "USD",
		MerchantOrderID:   orderID,
		MerchantTimestamp: time.Now().UTC().Format("2006-01-02T15:04:05"),
		PaymentMethod:     method,
		SuccessURL:        successURL,
		FailedURL:         failedURL,
		ErrorURL:          failedURL,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal PSP request: %w", err)
	}

	url := pspGatewayURL() + "/core/transactions/initiate"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := pspHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("PSP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PSP returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result PSPInitiateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode PSP response: %w", err)
	}
	return &result, nil
}

// PSPUpdateStatus tells PSP core-service that a transaction has reached a
// terminal status (PAID / FAILED). Used by simulated payment methods
// (PayPal/Crypto/QR) where there is no real acquirer callback.
// Server-to-server call, no CORS involved.
func PSPUpdateStatus(merchantOrderID, status, reason string) error {
	payload := map[string]interface{}{
		"status":              status,
		"reason":              reason,
		"globalTransactionId": fmt.Sprintf("sim-%d", time.Now().UnixMilli()),
		"acquirerTimestamp":   time.Now().UTC().Format(time.RFC3339),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal PSP status payload: %w", err)
	}

	url := fmt.Sprintf("%s/core/transactions/update-status/%s", pspGatewayURL(), merchantOrderID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := pspHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("PSP update-status request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("PSP update-status returned %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// PSPBankPaymentRequest is the payload accepted by the bank-service /api/bank/pay endpoint.
type PSPBankPaymentRequest struct {
	PAN             string  `json:"pan"`
	CVV             string  `json:"cvv"`
	ExpiryDate      string  `json:"expiryDate"`
	CardHolder      string  `json:"cardHolder"`
	Amount          float64 `json:"amount"`
	MerchantOrderID string  `json:"merchantOrderId"`
}

// PSPSubmitBankPayment forwards the card form to bank-service.
// The bank-service then notifies core-service of the result via internal channel,
// so by the time this returns, the PSP transaction status has been updated.
func PSPSubmitBankPayment(req PSPBankPaymentRequest) (map[string]interface{}, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal bank payment: %w", err)
	}

	url := pspGatewayURL() + "/bank/api/bank/pay"
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := pspHTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("bank request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var parsed map[string]interface{}
	_ = json.Unmarshal(respBody, &parsed)

	if resp.StatusCode != http.StatusOK {
		reason := ""
		if parsed != nil {
			if v, ok := parsed["error"].(string); ok {
				reason = v
			} else if v, ok := parsed["message"].(string); ok {
				reason = v
			}
		}
		if reason == "" {
			reason = string(respBody)
		}
		return parsed, fmt.Errorf("bank-service returned %d: %s", resp.StatusCode, reason)
	}
	return parsed, nil
}

type PayPalCreateResponse struct {
	PaymentID   string `json:"paymentId"`
	ApprovalURL string `json:"approvalUrl"`
	Status      string `json:"status"`
}

// PSPCreatePayPalPayment creates a real PayPal order via paypal-service.
// Returns the sandbox approvalUrl the user must be redirected to.
func PSPCreatePayPalPayment(pspTransactionID int64, merchantOrderID string, amount float64) (*PayPalCreateResponse, error) {
	payload := map[string]interface{}{
		"pspTransactionId":  pspTransactionID,
		"merchantOrderId":   merchantOrderID,
		"amount":            amount,
		"currency":          "USD",
		"merchantTimestamp": time.Now().UTC().Format(time.RFC3339),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal paypal create: %w", err)
	}

	url := pspGatewayURL() + "/paypal/paypal/create-payment"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := pspHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("paypal create request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("paypal-service returned %d: %s", resp.StatusCode, string(respBody))
	}
	var result PayPalCreateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode paypal response: %w", err)
	}
	return &result, nil
}

// PSPCapturePayPalPayment captures (executes) a PayPal order after the user
// approved it on the sandbox. paypal-service internally notifies core-service.
func PSPCapturePayPalPayment(paypalPaymentID, payerID, merchantOrderID string) error {
	payload := map[string]string{
		"paymentId":       paypalPaymentID,
		"payerId":         payerID,
		"merchantOrderId": merchantOrderID,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal paypal capture: %w", err)
	}

	url := pspGatewayURL() + "/paypal/paypal/execute-payment"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := pspHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("paypal capture request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("paypal-service capture returned %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

type PSPQRCodeResponse struct {
	QRCode    string `json:"qrCode"`    // base64-encoded PNG
	IPSString string `json:"ipsString"` // raw NBS IPS payload (contains RO:<pspTransactionId>)
}

// PSPGenerateQRCode asks the PSP core-service to generate the NBS IPS QR code
// for a transaction. The mobile banking app scans this QR, extracts the
// reference (RO:) and confirms the payment on the PSP directly.
func PSPGenerateQRCode(pspTransactionID int64) (*PSPQRCodeResponse, error) {
	url := fmt.Sprintf("%s/core/api/qr/generate/%d", pspGatewayURL(), pspTransactionID)
	resp, err := pspHTTPClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("PSP QR generate request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PSP QR generate returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result PSPQRCodeResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode PSP QR response: %w", err)
	}
	return &result, nil
}

// PSPGetTransactionStatus polls the PSP for the current status of a transaction.
func PSPGetTransactionStatus(pspTransactionID int64) (*PSPTransactionStatus, error) {
	url := fmt.Sprintf("%s/core/transactions/%d", pspGatewayURL(), pspTransactionID)
	resp, err := pspHTTPClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("PSP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("PSP transaction %d not found", pspTransactionID)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PSP returned status %d", resp.StatusCode)
	}

	var result PSPTransactionStatus
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode PSP response: %w", err)
	}
	return &result, nil
}
