import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import topicRoutes from "./routes/topicRoutes";
import problemRoutes from "./routes/problemRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { connectRedis, redisClient } from "./config/redis";

dotenv.config();

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("Server Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 7777;

async function startServer() {
  try {
    // 1️⃣ Connect Redis
    await connectRedis();

    // 2️⃣ Clear cache on deployment/start
    await redisClient.flushAll();
    console.log("Redis cache cleared on server startup");

    // 3️⃣ Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();