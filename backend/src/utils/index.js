import cron from "node-cron";
import { config } from "./config.js";
import app from "../app.js";
import { sweepInactiveStudents } from "../services/userLifecycle.service.js";

app.listen(config.port, () => {
  console.log(`Sandbox backend listening on port ${config.port}`);
});

cron.schedule("0 2 * * *", async () => {
  try {
    const result = await sweepInactiveStudents();
    console.log(`Inactivity sweep complete: deactivated ${result.deactivatedCount} user(s).`);
  } catch (error) {
    console.error("Inactivity sweep failed:", error);
  }
});
