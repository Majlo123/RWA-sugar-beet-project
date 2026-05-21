package controllers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

func currentUserClaims(c *gin.Context) (*services.CustomClaims, bool) {
	val, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "A server error occurred."})
		return nil, false
	}
	claims, ok := val.(*services.CustomClaims)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "A server error occurred."})
		return nil, false
	}
	return claims, true
}

func parseUserIDParam(c *gin.Context) (uint, bool) {
	raw := c.Param("userId")
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID."})
		return 0, false
	}
	return uint(id), true
}

func SubmitKYC(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}

	fh, err := c.FormFile("document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Document file is required."})
		return
	}

	in := services.KYCSubmitInput{
		FullName:       c.PostForm("fullName"),
		DocumentType:   c.PostForm("documentType"),
		DocumentNumber: c.PostForm("documentNumber"),
		DateOfBirth:    c.PostForm("dateOfBirth"),
		Country:        c.PostForm("country"),
	}

	resp, err := services.SubmitKYC(claims.ID, in, fh)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func GetMyKYC(c *gin.Context) {
	claims, ok := currentUserClaims(c)
	if !ok {
		return
	}
	resp, err := services.GetKYCStatusForUser(claims.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func ListKYC(c *gin.Context) {
	status := c.Query("status")
	items, err := services.ListKYCSubmissions(status)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func GetKYCDocument(c *gin.Context) {
	userID, ok := parseUserIDParam(c)
	if !ok {
		return
	}
	path, err := services.GetKYCDocumentPathForUser(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}
	c.File(path)
}

func ApproveKYC(c *gin.Context) {
	userID, ok := parseUserIDParam(c)
	if !ok {
		return
	}
	resp, err := services.ApproveKYC(userID)
	if err != nil {
		log.Printf("Error approving KYC (userId=%d): %v", userID, err)
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

func RejectKYC(c *gin.Context) {
	userID, ok := parseUserIDParam(c)
	if !ok {
		return
	}
	var req rejectRequest
	_ = c.ShouldBindJSON(&req)

	resp, err := services.RejectKYC(userID, req.Reason)
	if err != nil {
		log.Printf("Error rejecting KYC (userId=%d): %v", userID, err)
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}
