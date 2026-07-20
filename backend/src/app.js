import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { buildCorsOptions } from "./utils/cors.js";
import authRoutes from "./routes/auth.routes.js";
import missionRoutes from "./routes/mission.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import contentRoutes from "./routes/content.routes.js";
import badgeRoutes from "./routes/badge.routes.js";

const prisma = new PrismaClient();
const app = express();

app.use(cors(buildCorsOptions()));
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    message: "SDG Recycling backend API"
  });
});

app.get("/api/v1/health", (_request, response) => {
  response.json({ data: { status: "ok" } });
});

app.get("/api/v1/db-test", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ data: { status: "ok" } });
  } catch (error) {
    response.status(500).json({ error: { message: error.message } });
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/missions", missionRoutes);
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/badges", badgeRoutes);

export default app;
