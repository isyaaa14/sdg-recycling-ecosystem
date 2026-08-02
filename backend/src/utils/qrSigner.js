import crypto from "crypto";
import { config } from "./config.js";

function getSecret() {
  if (!config.qrSigningSecret) {
    throw new Error("QR_SIGNING_SECRET is not configured.");
  }
  return config.qrSigningSecret;
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function signQrPayload(payload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(stableStringify(payload))
    .digest("hex");
}

export function verifyQrPayload(payload, signature) {
  const expected = signQrPayload(payload);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature || "", "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
