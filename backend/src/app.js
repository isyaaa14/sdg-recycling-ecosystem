import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { buildCorsOptions } from "./utils/cors.js";
import missionRoutes from "./routes/mission.routes.js";

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

app.use("/api/v1/missions", missionRoutes);

export default app;
