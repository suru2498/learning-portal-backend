import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DSA Portal API",
      version: "1.0.0",
      description: "API documentation for DSA & System Design Portal",
    },
    servers: [
      {
        url: "http://localhost:7777",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],  // ✅ FIXED
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;