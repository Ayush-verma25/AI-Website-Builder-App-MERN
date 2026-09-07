import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectToDatabase } from "./config/db.js";
import authRouter from "./Routes/authRoutes.js";
import projectRouter from "./Routes/projectRoutes.js";

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ORIGINS 
    ? process.env.ORIGINS.split(",").map(o => o.trim()) 
    : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);

app.use((err, _req, res, _next) => {
  console.error(`[Unhandled Error]`, err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database, shutting down:", error);
    process.exit(1);
  }
}

startServer();
