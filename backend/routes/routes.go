package routes

import (
	"github.com/Majlo123/sugar-beet-backend/controllers"
	"github.com/Majlo123/sugar-beet-backend/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	auth := r.Group("/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
	}

	users := r.Group("/users")
	users.Use(middleware.AuthMiddleware())
	{
		users.GET("/profile", controllers.GetProfile)
		users.POST("/kyc/submit", controllers.SubmitKYC)
		users.GET("/kyc", controllers.GetMyKYC)
	}

	payments := r.Group("/payments")
	payments.Use(middleware.AuthMiddleware())
	{
		payments.POST("/initiate", controllers.InitiatePayment)
		payments.POST("/:id/confirm", controllers.ConfirmPayment)
		payments.POST("/:id/simulate", controllers.SimulatePayment)
		payments.POST("/:id/submit-card", controllers.SubmitBankPayment)
		payments.POST("/paypal/capture", controllers.CapturePayPal)
		payments.POST("/paypal/cancel", controllers.CancelPayPal)
		payments.GET("/history", controllers.GetMyPaymentHistory)
		payments.GET("/:id", controllers.GetPaymentByID)
	}

	admin := r.Group("/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.AdminMiddleware())
	{
		admin.GET("/analytics", controllers.GetAnalytics)
		admin.GET("/kyc", controllers.ListKYC)
		admin.GET("/kyc/:userId/document", controllers.GetKYCDocument)
		admin.POST("/kyc/:userId/approve", controllers.ApproveKYC)
		admin.POST("/kyc/:userId/reject", controllers.RejectKYC)
	}

	r.GET("/token-price", controllers.GetTokenPrice)
}
