# Dev to Azure Deployment Guide

This guide keeps Azure deployment simple for a student project with only `dev` and `main`.

## Branch Rule

```text
dev  = where integration happens
main = what gets deployed
```

`main` should stay empty or untouched until `dev` is locally proven.

When ready:

```bash
git checkout dev
git pull
git checkout main
git merge dev
git push origin main
```

If your deployment is connected to GitHub, Azure should deploy from `main`.

## Deployment Readiness

Before merging `dev` to `main`, confirm:

```text
[ ] backend starts locally
[ ] database migrations run
[ ] seed data works locally
[ ] Postman local smoke tests pass
[ ] web can login and call backend
[ ] mobile can login and call backend
[ ] API_CONTRACT.md matches the current backend
[ ] production environment variables are ready
```

## Azure Environment Variables

Set these in Azure App Service configuration or the deployment environment:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
JWT_SECRET=use-a-real-secret
JWT_EXPIRES_IN=1d
POINTS_LEDGER_URL=
POINTS_LEDGER_TIMEOUT_MS=3000
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
AZURE_STORAGE_CONNECTION_STRING=YOUR_AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_BLOB_BASE_URL=https://YOUR_STORAGE_ACCOUNT.blob.core.windows.net
```

Important:

```text
Do not use local PostgreSQL credentials in Azure.
Do not commit real Azure secrets into Git.
JWT_SECRET must be different from the example value.
FRONTEND_URL must match the deployed web URL for CORS.
Create the mission proof, content image, and mission image containers before testing uploads.
```

## Azure Start Command

The backend needs Prisma client generation and database migrations before starting.

Recommended startup command:

```bash
npx prisma generate && npx prisma migrate deploy && npm start
```

Only run seed data in Azure if the team wants demo accounts in production.

For demo/student marking, seeded data can be useful. For a cleaner production-like deployment, skip seeding.

## Production Smoke Test

Immediately after Azure deploys, run the shared Postman collection with a production/shared environment.

Required checks:

```text
GET  /api/v1/health
GET  /api/v1/db-test
POST /api/v1/auth/login
GET  /api/v1/auth/me
GET  /api/v1/missions
GET  /api/v1/content
GET  /api/v1/quizzes
GET  /api/v1/progress/me
GET  /api/v1/badges/progress
GET  /api/v1/points/me
```

Then point web and mobile to:

```text
https://YOUR_AZURE_BACKEND_DOMAIN/api/v1
```

## If Something Breaks After Deploy

Use this order:

1. Check Azure logs.
2. Check environment variables.
3. Check database connection string.
4. Check migrations.
5. Check CORS `FRONTEND_URL`.
6. Run Postman health and login checks.
7. Fix in `dev`.
8. Test locally again.
9. Merge `dev` into `main`.
10. Redeploy.

Do not edit random code directly on Azure. Keep Git as the source of truth.
