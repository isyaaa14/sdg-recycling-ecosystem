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

## Production GitHub Actions Setup

The production workflow is `.github/workflows/azure-app-service-production.yml`.
It builds and tests only the `backend/` application, then deploys a clean
Linux package without local environment files or seed execution.

The repository owner must create a GitHub environment named `production` and
configure these OIDC secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

The owner must also configure this GitHub Actions variable with the exact Azure
App Service resource name, not its full URL:

```text
AZURE_WEBAPP_NAME
```

Configure the Linux App Service once with Node.js 24 and this startup command:

```bash
npx prisma generate && npx prisma migrate deploy && npm start
```

The workflow excludes `node_modules` from the deployment package. Set
`SCM_DO_BUILD_DURING_DEPLOYMENT=true` so App Service installs Linux-compatible
production dependencies. Keep `prisma` in production dependencies because the
startup command uses its generation and migration CLI.

The Azure app's environment variables stay in Azure App Service configuration.
Do not copy Azure credentials, database passwords, JWT secrets, or QR signing
secrets into the workflow or repository.

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
QR_SIGNING_SECRET=use-a-real-secret
QR_DEFAULT_EXPIRY_MINUTES=15
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
AZURE_STORAGE_CONNECTION_STRING=YOUR_AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_CONTAINER_RECYCLING_PROOFS=recycling-proofs
AZURE_STORAGE_CONTAINER_REWARD_IMAGES=reward-images
AZURE_STORAGE_BLOB_BASE_URL=https://YOUR_STORAGE_ACCOUNT.blob.core.windows.net
```

Important:

```text
Do not use local PostgreSQL credentials in Azure.
Do not commit real Azure secrets into Git.
JWT_SECRET and QR_SIGNING_SECRET must each be different from the example value.
FRONTEND_URL must match the deployed web URL for CORS.
Create the mission proof, content image, mission image, recycling proof, and reward image containers before testing uploads.
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
GET  /api/v1/recycling/point-rates
GET  /api/v1/rewards
GET  /api/v1/leaderboard
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
