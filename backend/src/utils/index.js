import cron from "node-cron";
import { config } from "./config.js";
import app from "../app.js";
import { expireOverdueRedemptions } from "../services/reward.service.js";

app.listen(config.port, () => {
  console.log(`Sandbox backend listening on port ${config.port}`);
});

let reservationExpirySweepRunning = false;

cron.schedule("* * * * *", async () => {
  if (reservationExpirySweepRunning) return;
  reservationExpirySweepRunning = true;

  try {
    const result = await expireOverdueRedemptions();
    if (result.cancelledCount > 0) {
      console.log(`Reservation expiry sweep complete: cancelled ${result.cancelledCount} redemption(s).`);
    }
  } catch (error) {
    console.error("Reservation expiry sweep failed:", error);
  } finally {
    reservationExpirySweepRunning = false;
  }
});
