import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRouter from "./Routes/authRoutes.js";
import projectRouter from "./Routes/projectRoutes.js";

const app = express();

await connectDB();

app.use(cors({ origin: process.env.ORIGINS.split(","), credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SiteSpark API is running");
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter)

//Centralised error handling
app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
