package docs

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed openapi.json
var openAPISpec []byte

const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sugar Beet Token API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/api-docs/swagger.json",
        dom_id: "#swagger-ui"
      });
    };
  </script>
</body>
</html>`

func RegisterSwagger(r *gin.Engine) {
	r.GET("/api-docs", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerHTML))
	})
	r.GET("/api-docs/", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerHTML))
	})
	r.GET("/api-docs/swagger.json", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json", openAPISpec)
	})
}
