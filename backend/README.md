# SDG Recycling Backend

Node.js and Express REST API for the SDG Recycling Ecosystem. It exposes the shared `/api/v1` contract used by the Android app, browser test console, and Postman tests.

## Capabilities

- JWT registration, login, profiles, roles, and manual account lifecycle controls
- Missions, joins, proof submissions, admin review, completion rules, and points
- Recycling submissions, signed QR claims, point rates, and anti-gaming checks
- Educational content, quizzes, attempts, learning progress, and badges
- Rewards, reservations, expiry/refunds, redemption completion, and stock control
- Leaderboards, admin notifications, and audit logs
- Mission, content, recycling-proof, and reward image uploads through Azurite or Azure Blob Storage
- PostgreSQL schema management with Prisma migrations and repeatable seed data

## Technology

- Node.js 20 and Express 4
- Prisma 5 and PostgreSQL 16
- JWT, bcrypt, and Zod
- Azure Blob Storage SDK and Multer
- Jest and Supertest

## Fastest local setup

From the repository root:

```bash
docker compose up -d --build
docker compose exec backend npm run prisma:seed
```

The Compose stack runs:

- API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Azurite Blob service: `localhost:10000`

Check API and database health:

```bash
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/db-test
```

The container applies deployed migrations on startup. Seeding is an explicit command and is safe to repeat because the seed script upserts its records.

## Run without Docker

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or a compatible supported PostgreSQL server)
- Azurite or an Azure Storage account for upload features

From `backend/`:

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed. Update `.env` before starting. Never reuse the example secrets in a deployed environment.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment, normally `development`, `test`, or `production` |
| `PORT` | HTTP port; defaults to `5000` |
| `DATABASE_URL` | Prisma PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign access tokens |
| `JWT_EXPIRES_IN` | Token lifetime, such as `1d` |
| `FRONTEND_URL` | Allowed browser origin for CORS |
| `POINTS_LEDGER_URL` | Optional external points ledger URL |
| `POINTS_LEDGER_TIMEOUT_MS` | External ledger request timeout |
| `QR_SIGNING_SECRET` | Secret used to sign recycling QR payloads |
| `QR_DEFAULT_EXPIRY_MINUTES` | Default QR lifetime |
| `AZURE_STORAGE_CONNECTION_STRING` | Azurite or Azure Blob connection string |
| `AZURE_STORAGE_CONTAINER_MISSION_PROOFS` | Mission-proof container |
| `AZURE_STORAGE_CONTAINER_CONTENT_IMAGES` | Learning-content image container |
| `AZURE_STORAGE_CONTAINER_MISSION_IMAGES` | Mission image container |
| `AZURE_STORAGE_CONTAINER_RECYCLING_PROOFS` | Recycling-proof container |
| `AZURE_STORAGE_CONTAINER_REWARD_IMAGES` | Reward image container |
| `AZURE_STORAGE_BLOB_BASE_URL` | Public/local base URL returned for blobs |

See [`.env.example`](.env.example) for a local template and `.env.docker` for the Compose-only service addresses.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with Node watch mode |
| `npm start` | Start normally |
| `npm run lint` | Run the current JavaScript syntax checks |
| `npm test` | Run Jest/Supertest tests |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply a development migration |
| `npm run prisma:seed` | Upsert demo data |
| `npm run prisma:studio` | Open Prisma Studio |

Recommended pre-commit checks:

```bash
npm run lint
npx prisma validate
npm test
```

## API route groups

All application endpoints are under `/api/v1`.

| Group | Responsibility |
| --- | --- |
| `/auth`, `/users` | Authentication and current-user profile |
| `/missions`, `/submissions` | Missions and proof review |
| `/content`, `/quizzes`, `/progress` | Learning content and assessment |
| `/badges`, `/points`, `/leaderboard` | Engagement and recognition |
| `/recycling`, `/anti-gaming` | Recycling submissions, QR codes, rates, and fraud controls |
| `/rewards` | Reward catalog and redemptions |
| `/uploads` | Blob upload metadata and file endpoints |
| `/admin` | Admin notifications and student lifecycle controls |
| `/audit-logs` | Admin audit history |

Use the repository's [API contract](../docs/API_CONTRACT.md) for payload details and the [Postman guide](../postman/README.md) for executable examples.

## Demo accounts

After seeding, all demo accounts use `Password123!`:

- Admin: `admin@uow.edu.my`
- Students: `student1@student.uow.edu.my`, `student2@student.uow.edu.my`, and `student3@student.uow.edu.my`

These credentials are not suitable for production.

## Source structure

```text
prisma/          schema, migrations, and seed data
scripts/         one-off backend utilities
src/routes/      HTTP route definitions and authorization gates
src/controllers/ request/response handling
src/services/    business rules
src/repositories/ Prisma data access
src/validators/  request validation schemas
src/middleware/  authentication and uploads
src/tests/       API, service, migration, and utility tests
src/utils/       configuration and shared helpers
```

## Troubleshooting

- `P1001`/database connection errors: verify PostgreSQL is ready and that `DATABASE_URL` uses `postgres` as the host inside Compose, but `localhost` outside it.
- Upload failures: verify the storage connection string, container names, and Azurite/Azure availability.
- Browser CORS errors: `FRONTEND_URL` must match the requesting origin exactly; restart after changing it.
- Prisma client/schema mismatch: run `npm run prisma:generate`, then apply the appropriate migration command.
