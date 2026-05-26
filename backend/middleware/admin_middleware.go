package middleware

import (
	"net/http"

	"github.com/Majlo123/sugar-beet-backend/services"
	"github.com/gin-gonic/gin"
)

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"message": "Authorization failed: Token not provided.",
			})
			return
		}
		claims, ok := val.(*services.CustomClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"message": "Server error.",
			})
			return
		}
		if claims.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"message": "Access denied: Admin privileges required.",
			})
			return
		}
		c.Next()
	}
}
