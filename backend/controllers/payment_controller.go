package controllers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

type initiatePaymentRequest struct {
	AmountUSD     int64  `json:"amountUSD"`
	PaymentMethod string `json:"paymentMethod"`
}

func InitiatePayment(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}

	var req initiatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body."})
		return
	}
	if req.AmountUSD == 0 || req.PaymentMethod == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount and payment method are required."})
		return
	}

	result, err := services.InitiatePayment(claims.ID, req.AmountUSD, req.PaymentMethod)
	if err != nil {
		log.Printf("InitiatePayment error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}

func ConfirmPayment(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}

	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || paymentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment id."})
		return
	}

	result, err := services.ConfirmPayment(uint(paymentID), claims.ID)
	if err != nil {
		log.Printf("ConfirmPayment error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}

func GetPaymentByID(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}

	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || paymentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment id."})
		return
	}

	payment, err := services.GetUserPaymentByID(claims.ID, uint(paymentID))
	if err != nil {
		log.Printf("GetPaymentByID error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusNotFound, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, payment)
}

type simulatePaymentRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

func SimulatePayment(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || paymentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment id."})
		return
	}
	var req simulatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body."})
		return
	}

	result, err := services.SimulatePayment(uint(paymentID), claims.ID, req.Status, req.Reason)
	if err != nil {
		log.Printf("SimulatePayment error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, result)
}

type submitBankPaymentRequest struct {
	PAN        string `json:"pan"`
	CVV        string `json:"cvv"`
	ExpiryDate string `json:"expiryDate"`
	CardHolder string `json:"cardHolder"`
}

func SubmitBankPayment(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || paymentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment id."})
		return
	}
	var req submitBankPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body."})
		return
	}

	result, err := services.SubmitBankPayment(uint(paymentID), claims.ID, req.PAN, req.CVV, req.ExpiryDate, req.CardHolder)
	if err != nil {
		log.Printf("SubmitBankPayment error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

type capturePayPalRequest struct {
	MerchantOrderID string `json:"merchantOrderId"`
	PayPalOrderID   string `json:"paypalOrderId"`
	PayerID         string `json:"payerId"`
}

// CapturePayPal is called by the frontend after the user is redirected back
// from PayPal sandbox approval. We expect `token` (PayPal order id) and
// `PayerID` query params alongside our own merchantOrderId.
func CapturePayPal(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}
	var req capturePayPalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body."})
		return
	}
	if req.MerchantOrderID == "" || req.PayPalOrderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "merchantOrderId and paypalOrderId are required."})
		return
	}

	result, err := services.CapturePayPalPayment(claims.ID, req.MerchantOrderID, req.PayPalOrderID, req.PayerID)
	if err != nil {
		log.Printf("CapturePayPal error: %v", err)
		if errors.Is(err, services.ErrPaymentValidation) {
			msg := strings.TrimPrefix(err.Error(), services.ErrPaymentValidation.Error()+": ")
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

type cancelPayPalRequest struct {
	MerchantOrderID string `json:"merchantOrderId"`
}

func CancelPayPal(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}
	var req cancelPayPalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body."})
		return
	}
	if err := services.CancelPayPalPayment(claims.ID, req.MerchantOrderID); err != nil {
		log.Printf("CancelPayPal error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "FAILED"})
}

func GetMyPaymentHistory(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}

	payments, err := services.GetUserPayments(claims.ID)
	if err != nil {
		log.Printf("GetMyPaymentHistory error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "A server error occurred."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"payments": payments})
}
