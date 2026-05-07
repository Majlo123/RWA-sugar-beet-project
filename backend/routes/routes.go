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
	{
		users.GET("/profile", middleware.AuthMiddleware(), controllers.GetProfile)
	}

	r.GET("/token-price", controllers.GetTokenPrice)
	r.POST("/record-investment", controllers.RecordInvestment)
}
