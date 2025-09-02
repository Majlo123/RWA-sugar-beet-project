const PORT = process.env.PORT || 5000;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Sugar Beet Token API",
    version: "1.0.0",
    description: "API za upravljanje investicijama u šećernu repu",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
    },
  ],
  paths: {
    "/token-price": {
      get: {
        summary: "Vraća cenu jednog tokena u USD",
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
  },
};

module.exports = swaggerDefinition;