DROP INDEX IF EXISTS "Redemption_status_idx";

CREATE INDEX "Redemption_status_expiresAt_idx" ON "Redemption"("status", "expiresAt");
