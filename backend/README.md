# SDG Engagement Backend v2

This backend is the Student 4 service workspace for the SDG recycling ecosystem. It focuses on the scoped backend engines only:

- missions
- educational content
- quizzes and learning progress
- badges
- analytics
- points-event emission to the shared ledger API

The service is exposed through `/api/v1` and is designed as a clean backend layer that can later be shifted into the team production-development repo.

## Scope boundaries

Included:

- mission definition, submission, review, and anti-duplicate rules
- educational content publishing, tagging, and filtering
- quiz creation, scoring, and learning progress updates
- badge definition, evaluation, and idempotent issuance
- analytics for the Student 4 engine scope
- Prisma migrations and seed data
- Postman and Jest test harness
- optional mission-proof uploads through Azurite or Azure Blob Storage

Excluded:

- rewards and redemptions
- leaderboards
- QR security flows
- Android UI
- Web UI

## Tech stack

- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- Zod validation
- Jest + Supertest
- Azurite or Azure Blob Storage for mission-proof uploads

## Environment variables

Create `.env` from `.env.example` for local non-Docker work.

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `POINTS_LEDGER_URL`
- `POINTS_LEDGER_TIMEOUT_MS`
- `FRONTEND_URL`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_MISSION_PROOFS`
- `AZURE_STORAGE_BLOB_BASE_URL`

## Local development

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run lint/checks:

```bash
npm run lint
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate -- --name init
```

Seed demo data:

```bash
npm run prisma:seed
```

## Docker local stack

From `student4-backend-workspace/`:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

The local Docker setup starts:

- backend on `http://localhost:5000`
- PostgreSQL on `localhost:5432`
- Azurite on `localhost:10000`

The backend container runs:

- `prisma generate`
- `prisma migrate deploy`
- `npm run prisma:seed`
- `npm start`

## Seeded login accounts

All seeded users use this password:

```text
Password123!
```

Seeded accounts:

- admin: `admin@sdg.local`
- student: `student1@sdg.local`
- student: `student2@sdg.local`
- student: `student3@sdg.local`

## API overview

Health and auth:

- `GET /api/v1/health`
- `GET /api/v1/db-test`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Missions:

- `POST /api/v1/missions`
- `GET /api/v1/missions`
- `GET /api/v1/missions/:id`
- `PATCH /api/v1/missions/:id`
- `DELETE /api/v1/missions/:id`
- `POST /api/v1/missions/:id/submit`
- `GET /api/v1/missions/:id/submissions`
- `GET /api/v1/submissions`
- `PATCH /api/v1/submissions/:id/review`

Content and quizzes:

- `POST /api/v1/content`
- `GET /api/v1/content`
- `GET /api/v1/content/:id`
- `PATCH /api/v1/content/:id`
- `DELETE /api/v1/content/:id`
- `POST /api/v1/content/:contentId/quizzes`
- `GET /api/v1/content/:contentId/quizzes`
- `GET /api/v1/quizzes/:id`
- `POST /api/v1/quizzes/:id/attempts`
- `GET /api/v1/users/me/progress`

Badges and analytics:

- `POST /api/v1/badges`
- `GET /api/v1/badges`
- `GET /api/v1/badges/:id`
- `PATCH /api/v1/badges/:id`
- `POST /api/v1/badges/evaluate/:userId`
- `GET /api/v1/users/me/badges`
- `GET /api/v1/analytics/engagement`
- `GET /api/v1/analytics/missions`
- `GET /api/v1/analytics/learning`
- `GET /api/v1/analytics/badges`

## Postman

Use the files under `../postman/`:

- `postman_collection.json`
- `postman_environment_local.json`
- `postman_environment_shared.json`

The collection covers:

- auth
- student mission flow
- admin mission flow
- content
- quizzes
- badges
- analytics
