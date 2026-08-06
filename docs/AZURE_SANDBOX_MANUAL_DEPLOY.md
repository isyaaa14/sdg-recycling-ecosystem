# Azure Sandbox Manual Deployment Guide

This guide is for deploying the sandbox resources manually.

## Resource Map

```text
Resource group:      rg-sdg-recycling-sandbox
Backend App Service: app-sdg-backend-sandbox
PostgreSQL server:   psql-sdg-sandbox
Storage account:     stsdgsandboxuploads
Static Web App:      swa-sdg-web-sandbox
```

## Deployment Order

1. Configure PostgreSQL.
2. Configure blob storage containers.
3. Configure App Service environment variables.
4. Deploy the backend from `backend/`.
5. Deploy the dummy Static Web App from `azure-static-test-site/`.
6. Smoke test the backend and browser site.

## Where The App Settings Come From

### `NODE_ENV`

Use this exact value:

```env
NODE_ENV=production
```

This tells Express and dependencies the app is running in a deployed environment.

### `DATABASE_URL`

Get these values from the Azure PostgreSQL resource:

```text
Azure Portal -> psql-sdg-sandbox -> Overview
```

You need:

```text
Host/server name
Admin username
Admin password
Database name
```

The database URL format is:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&sslmode=require
```

Example shape:

```env
DATABASE_URL=postgresql://sdgadmin:YOUR_PASSWORD@psql-sdg-sandbox.postgres.database.azure.com:5432/sdg_recycling_sandbox?schema=public&sslmode=require
```

Do not commit the real value.

### `JWT_SECRET`

You create this yourself. It should be a long random string.

PowerShell example:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Set it as:

```env
JWT_SECRET=PASTE_RANDOM_VALUE_HERE
```

### `QR_SIGNING_SECRET`

Generate the same way as `JWT_SECRET`, but as a separate random value (do not
reuse `JWT_SECRET`) — it signs recycling QR code payloads.

```env
QR_SIGNING_SECRET=PASTE_ANOTHER_RANDOM_VALUE_HERE
QR_DEFAULT_EXPIRY_MINUTES=15
```

### `JWT_EXPIRES_IN`

Use this exact value unless you want shorter logins:

```env
JWT_EXPIRES_IN=1d
```

### `FRONTEND_URL`

Get this after the Static Web App exists:

```text
Azure Portal -> swa-sdg-web-sandbox -> Overview -> URL
```

Example shape:

```env
FRONTEND_URL=https://YOUR_STATIC_WEB_APP.azurestaticapps.net
```

This is used for backend CORS.

### `POINTS_LEDGER_URL`

Leave this empty for now unless the separate points ledger service is deployed.

```env
POINTS_LEDGER_URL=
POINTS_LEDGER_TIMEOUT_MS=3000
```

### `AZURE_STORAGE_CONNECTION_STRING`

Get this from:

```text
Azure Portal -> stsdgsandboxuploads -> Security + networking -> Access keys
```

Copy one connection string.

```env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

Do not commit the real value.

### Blob Container Names

Create these containers in:

```text
Azure Portal -> stsdgsandboxuploads -> Data storage -> Containers
```

Then use these exact app settings:

```env
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_CONTAINER_RECYCLING_PROOFS=recycling-proofs
AZURE_STORAGE_CONTAINER_REWARD_IMAGES=reward-images
```

### `AZURE_STORAGE_BLOB_BASE_URL`

This comes from the storage account name:

```env
AZURE_STORAGE_BLOB_BASE_URL=https://stsdgsandboxuploads.blob.core.windows.net
```

## PostgreSQL Setup

In Azure Portal:

1. Open `psql-sdg-sandbox`.
2. Go to `Settings -> Databases`.
3. Create a database, for example:

```text
sdg_recycling_sandbox
```

4. Go to `Networking`.
5. Allow Azure services to access the PostgreSQL server.
6. Add your current public IP address if you want to connect from your laptop.

The backend migrations will create the tables when App Service starts with:

```bash
npx prisma generate && npx prisma migrate deploy && npm start
```

Optional demo data can be loaded later with:

```bash
npx prisma db seed
```

Do not run seed automatically on every startup.

## Sandbox Data Seeding

Seed the sandbox after migrations have succeeded and `/api/v1/db-test` returns
`status: ok`.

For this project, seeding is recommended in sandbox because it creates known
demo users, missions, content, quizzes, badges, submissions and progress records
needed by Postman, web and mobile smoke tests.

Seeded login accounts:

```text
admin@sdg.local / Password123!
student1@sdg.local / Password123!
student2@sdg.local / Password123!
student3@sdg.local / Password123!
```

Run seed once from the App Service SSH or Kudu console:

```bash
cd /home/site/wwwroot
npx prisma db seed
```

Alternative, if your laptop IP is allowed through the PostgreSQL firewall, run
from local `backend/` with the Azure `DATABASE_URL` set for that command only.

Do not use production data for sandbox seeding.

## App Service Backend Settings

In:

```text
Azure Portal -> app-sdg-backend-sandbox -> Settings -> Environment variables
```

Add:

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&sslmode=require
JWT_SECRET=YOUR_RANDOM_SECRET
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://YOUR_STATIC_WEB_APP.azurestaticapps.net
POINTS_LEDGER_URL=
POINTS_LEDGER_TIMEOUT_MS=3000
QR_SIGNING_SECRET=YOUR_OTHER_RANDOM_SECRET
QR_DEFAULT_EXPIRY_MINUTES=15
AZURE_STORAGE_CONNECTION_STRING=YOUR_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_CONTAINER_RECYCLING_PROOFS=recycling-proofs
AZURE_STORAGE_CONTAINER_REWARD_IMAGES=reward-images
AZURE_STORAGE_BLOB_BASE_URL=https://stsdgsandboxuploads.blob.core.windows.net
```

Set the startup command:

```bash
npx prisma generate && npx prisma migrate deploy && npm start
```

## Manual Backend Deployment

Deploy only the backend folder.

```powershell
cd backend
Compress-Archive -Path * -DestinationPath ..\backend-deploy.zip -Force
az webapp deploy `
  --resource-group rg-sdg-recycling-sandbox `
  --name app-sdg-backend-sandbox `
  --src-path ..\backend-deploy.zip `
  --type zip
```

Smoke test:

```text
https://app-sdg-backend-sandbox.azurewebsites.net/
https://app-sdg-backend-sandbox.azurewebsites.net/api/v1/health
https://app-sdg-backend-sandbox.azurewebsites.net/api/v1/db-test
```

## Dummy Static Web App Deployment

The dummy site is in:

```text
azure-static-test-site/
```

It has no build step.

Deploy that folder to `swa-sdg-web-sandbox` using Azure Static Web Apps CLI or the Azure Portal deployment option.

With SWA CLI:

```powershell
cd azure-static-test-site
swa deploy . --app-name swa-sdg-web-sandbox --resource-group rg-sdg-recycling-sandbox --env production
```

After deployment, open the Static Web App URL. It will call:

```text
https://app-sdg-backend-sandbox.azurewebsites.net/api/v1/health
```

To test a different backend URL, add `?api=`:

```text
https://YOUR_STATIC_WEB_APP.azurestaticapps.net/?api=https://OTHER_BACKEND/api/v1
```

## Postman Smoke Tests

Use one shared Postman collection for every environment:

```text
postman/postman_collection.json
```

Then choose the environment that matches the backend you want to test:

```text
postman/postman_environment_local.json       local laptop backend
postman/postman_environment_shared.json      future shared Azure backend
offline/postman_environment_personal_sandbox.json  personal sandbox backend
```

The `offline/` folder is ignored by Git, so personal sandbox exports can stay
on your machine without being committed.

Run these requests first:

```text
01 - Auth -> Login Admin
01 - Auth -> Login Student
```

The login test scripts save `adminToken` and `studentToken` into the active
Postman environment automatically, so later requests using `Bearer
{{adminToken}}` or `Bearer {{studentToken}}` do not need manual token copying.
