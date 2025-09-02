const express = require("express");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerDefinition = require("./docs/swaggerDef");
const treasuryRoutes = require("./routes/treasury.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Swagger Docs
const swaggerSpec = swaggerJSDoc({
    definition: swaggerDefinition,
    apis: [], 
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Rute
app.use("/", treasuryRoutes);

// Pokretanje servera
app.listen(PORT, () => {
  console.log(`Server sluša na portu ${PORT}`);
  console.log(`Swagger dokumentacija je dostupna na http://localhost:${PORT}/api-docs`);
});