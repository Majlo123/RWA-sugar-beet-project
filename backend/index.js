const express = require("express");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerDefinition = require("./docs/swaggerDef");
const treasuryRoutes = require("./routes/treasury.routes");
const authRoutes = require("./routes/auth.routes");
const db = require("./config/database");

// Uvozimo User model koji smo upravo kreirali
require("./models/user.model");

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
app.use("/auth", authRoutes)
// Pokretanje servera nakon sinhronizacije sa bazom
const startServer = async () => {
  try {
    await db.authenticate();
    console.log('Konekcija sa bazom podataka je uspešno uspostavljena.');
    
    // Sinhronizujemo sve definisane modele sa bazom
    await db.sync(); 
    console.log("Svi modeli su uspešno sinhronizovani.");

    app.listen(PORT, () => {
      console.log(`Server sluša na portu ${PORT}`);
      console.log(`Swagger dokumentacija je dostupna na http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Nije moguće povezati se sa bazom:', error);
  }
};

startServer();