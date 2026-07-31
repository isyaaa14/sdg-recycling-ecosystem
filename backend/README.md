# SDG Recycling Backend

Node/Express backend for the SDG recycling ecosystem. It exposes the shared `/api/v1` API used by web and mobile.

## Included Scope

- Auth with JWT and seeded student/admin accounts
- Missions, mission join, proof submission, review, mission-completion points, and badges
- Educational content with summaries, images, structured content blocks, and fixed tags
- Quizzes, attempts, learning progress, best score, and result review data
- Badge progress for mission completion, approved submissions, quizzes, and content completion
- Mission proof, content image, and mission image uploads through Azurite or Azure Blob Storage
- Prisma migrations and seed data
- Postman collection/environment files

Student 3 reward, QR, redemption, and separate ledger modules are not merged here yet.

## Tech Stack

- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- Zod validation
- Jest + Supertest
- Azurite or Azure Blob Storage for uploads

## Environment Variables

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
- `AZURE_STORAGE_CONTAINER_CONTENT_IMAGES`
- `AZURE_STORAGE_CONTAINER_MISSION_IMAGES`
- `AZURE_STORAGE_BLOB_BASE_URL`

## Local Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run lint
npx prisma validate
npm test
```

Start without Docker:

```bash
npm run dev
```

Run migrations and seed:

```bash
npx prisma migrate dev
npm run prisma:seed
```

## Docker Local Stack

From the project root:

```bash
docker compose up -d --build
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

## Seeded Login Accounts

All seeded users use this password:

```text
Password123!
```

Seeded accounts:

- admin: `admin@sdg.local`
- student: `student1@sdg.local`
- student: `student2@sdg.local`
- student: `student3@sdg.local`

## Points Model

Active student point totals use `MISSION_COMPLETED` events.

Mission completion rules:

```text
QUANTITY_BASED - approved quantity total reaches targetQuantity
STREAK_BASED   - approved submission count reaches targetDays
TIME_LIMITED   - at least one approved submission
```

Old `MISSION_APPROVED` events are kept only as compatibility/history data and are not counted by `/api/v1/points/me`.

## API Overview

Health and auth:

- `GET /api/v1/health`
- `GET /api/v1/db-test`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Missions and submissions:

- `POST /api/v1/missions`
- `GET /api/v1/missions`
- `GET /api/v1/missions/:id`
- `PATCH /api/v1/missions/:id`
- `POST /api/v1/missions/:id/image`
- `DELETE /api/v1/missions/:id`
- `POST /api/v1/missions/:id/join`
- `POST /api/v1/missions/:id/submit`
- `GET /api/v1/missions/:id/submissions`
- `GET /api/v1/submissions`
- `GET /api/v1/submissions/me`
- `GET /api/v1/submissions/:id`
- `PATCH /api/v1/submissions/:id/review`

Content, quizzes, and progress:

- `POST /api/v1/content`
- `GET /api/v1/content`
- `GET /api/v1/content/:id`
- `PUT /api/v1/content/:id`
- `DELETE /api/v1/content/:id`
- `GET /api/v1/content/:id/revisions`
- `POST /api/v1/quizzes`
- `GET /api/v1/quizzes`
- `GET /api/v1/quizzes/:id`
- `PATCH /api/v1/quizzes/:id`
- `POST /api/v1/quizzes/:id/questions`
- `PATCH /api/v1/quizzes/:id/questions/:questionId`
- `DELETE /api/v1/quizzes/:id/questions/:questionId`
- `POST /api/v1/quizzes/:id/attempts`
- `GET /api/v1/quizzes/:id/attempts/me`
- `GET /api/v1/quizzes/:id/attempts`
- `GET /api/v1/progress/me`

Badges, points, and uploads:

- `POST /api/v1/badges`
- `GET /api/v1/badges`
- `GET /api/v1/badges/progress`
- `GET /api/v1/badges/:id`
- `PATCH /api/v1/badges/:id`
- `DELETE /api/v1/badges/:id`
- `GET /api/v1/badges/:id/awards`
- `GET /api/v1/points/me`
- `GET /api/v1/points`
- `POST /api/v1/uploads/mission-proof`
- `POST /api/v1/uploads/content-image`
- `GET /api/v1/uploads/mine`
- `GET /api/v1/uploads/:id`

## Postman

Use the files under `../postman/` for shared testing:

- `postman_collection.json`
- `postman_environment_local.json`
- `postman_environment_shared.json`
- `sample_payloads.json`
