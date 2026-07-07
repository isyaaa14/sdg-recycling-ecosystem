import "dotenv/config";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  frontendUrl: process.env.FRONTEND_URL,
  pointsLedgerUrl: process.env.POINTS_LEDGER_URL,
  pointsLedgerTimeoutMs: Number(process.env.POINTS_LEDGER_TIMEOUT_MS) || 3000,
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  azureStorageContainerMissionProofs: process.env.AZURE_STORAGE_CONTAINER_MISSION_PROOFS,
  azureStorageBlobBaseUrl: process.env.AZURE_STORAGE_BLOB_BASE_URL
};
