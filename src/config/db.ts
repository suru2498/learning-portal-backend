import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

logger.info("Initializing MySQL connection pool", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {

    const connection = await pool.getConnection();

    logger.info("MySQL database connected successfully");

    connection.release();

  } catch (error: any) {

    logger.error("MySQL database connection failed", {
      message: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
})();