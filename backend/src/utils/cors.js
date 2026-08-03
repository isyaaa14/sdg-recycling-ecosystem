import { config } from "./config.js";

function isAllowedLocalDevelopmentOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname === "10.0.2.2"
    );
  } catch {
    return false;
  }
}

export function buildCorsOptions() {
  const configuredOrigins = (config.frontendUrl || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (
        configuredOrigins.length === 0 ||
        configuredOrigins.includes(origin) ||
        isAllowedLocalDevelopmentOrigin(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS."));
    },
    credentials: true
  };
}
