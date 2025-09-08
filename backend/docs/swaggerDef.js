const PORT = process.env.PORT || 5000;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Sugar Beet Token API",
    version: "1.0.0",
    description: "API za upravljanje investicijama u šećernu repu i korisnicima",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  servers: [
    {
      url: `http://localhost:${PORT}`,
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Registruje novog korisnika",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string", example: "investitor1" },
                  password: { type: "string", example: "lozinka123" },
                  ethAddress: { type: "string", example: "0x... adresa novog naloga" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Korisnik uspešno registrovan." },
          400: { description: "Korisničko ime je zauzeto ili su podaci neispravni." }
        }
      }
    },
     "/auth/login": {
      post: {
        summary: "Prijavljuje postojećeg korisnika",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string", example: "investitor1" },
                  password: { type: "string", example: "lozinka123" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Uspešna prijava, vraća JWT token." },
          400: { description: "Pogrešni podaci." }
        }
      }
    },
    "/token-price": {
      get: {
        summary: "Vraća cenu jednog tokena u USD",
        tags: ["Treasury"],
        description: "Očitava javnu konstantu TOKEN_PRICE_USD sa pametnog ugovora.",
        responses: {
          200: {
            description: "Uspešan odgovor sa cenom tokena.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokenPriceUSD: { type: "string", example: "1000" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/record-investment": {
      post: {
        summary: "Evidentira novu investiciju (samo za admina)",
        tags: ["Treasury"],
        description: "Poziva recordInvestment funkciju na pametnom ugovoru.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  investorAddress: {
                    type: "string",
                    description: "Ethereum adresa investitora.",
                    example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                  },
                  amountUSD: {
                    type: "number",
                    description: "Iznos investicije u USD.",
                    example: 2000,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Transakcija uspešno izvršena.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    txHash: { type: "string", example: "0x123abc..." },
                  },
                },
              },
            },
          },
        },
      },
    },
     "/users/profile": { // <-- NOVA RUTA
      get: {
        summary: "Vraća podatke o prijavljenom korisniku",
        tags: ["Users"],
        security: [{ bearerAuth: [] }], // Označavamo da je ova ruta zaštićena
        responses: {
          200: { description: "Podaci o korisniku." },
          401: { description: "Autorizacija neuspešna." }
        }
      }
    },
  },
};

module.exports = swaggerDefinition;