import { config } from "./config.js";

export function buildCorsOptions() {
  return {
    origin: config.frontendUrl || true,
    credentials: true
  };
}
