UPDATE "User"
SET
  "isActive" = TRUE,
  "deactivatedAt" = NULL,
  "deactivationReason" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "role" = 'STUDENT'
  AND "isActive" = FALSE
  AND "deactivationReason" = 'Auto-deactivated: no recycling submission in 3+ days';

DELETE FROM "AdminNotification"
WHERE
  "type" = 'USER_DEACTIVATED'
  AND "message" LIKE '%was auto-deactivated after 3 days of recycling inactivity.%';
