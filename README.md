# SDG Recycling Ecosystem

An end-to-end recycling engagement platform for students and administrators. The project combines an Android student app, a Node.js REST API, PostgreSQL persistence, blob-backed evidence uploads, rewards, leaderboards, learning content, quizzes, and administrative testing tools.

## Project status

This repository is an integration workspace. The backend and Android client contain the main application code; the browser test console and Postman collection support API testing. `web-interface/` is currently only a frontend placeholder and is not a runnable web application yet.

## Repository layout

| Path | Purpose | Documentation |
| --- | --- | --- |
| `backend/` | Express API, Prisma schema/migrations, tests, and seed data | [Backend guide](backend/README.md) |
| `mobile-app/` | Android app built with Kotlin and Jetpack Compose | [Mobile guide](mobile-app/README.md) |
| `web-interface/` | Placeholder for the future web client | [Web status](web-interface/README.md) |
| `static-deploy/` | Plain HTML/JS backend integration console | [Console guide](static-deploy/README.md) |
| `postman/` | Shared API collection, environments, and UAT workflow | [Postman guide](postman/README.md) |
| `docs/` | API contract, integration, deployment, and security notes | [Documentation index](#project-documentation) |
| `burpsuite/` | Burp Suite requests and Azure security test playbook | [Security playbook](docs/BURP_SECURITY_TEST_PLAYBOOK.md) |
| `sql_backup/` | Database backup and UAT cleanup files; not application source | — |

> Some local workspace directories are ignored by Git. Check `.gitignore` before assuming a file in those directories will be committed or deployed.

## Quick start with Docker

### Prerequisites

- Docker Desktop with Docker Compose
- Git

From the repository root, start PostgreSQL, Azurite, and the backend:

```bash
docker compose up -d --build
```

Apply the seed data the first time you create the database, or whenever you need to restore the demo records:

```bash
docker compose exec backend npm run prisma:seed
```

Verify the services:

```bash
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/db-test
```

The local services are exposed at:

| Service | URL/port |
| --- | --- |
| Backend API | `http://localhost:5000/api/v1` |
| PostgreSQL | `localhost:5432` |
| Azurite Blob service | `http://localhost:10000` |

Stop the stack with `docker compose down`. This preserves the database and blob volumes. Use `docker compose down -v` only when you intentionally want to delete all local container data.

## Demo accounts

The seed script creates the following accounts. All use the password `Password123!` and are intended only for local/demo environments.

| Role | Email |
| --- | --- |
| Admin | `admin@uow.edu.my` |
| Student | `student1@student.uow.edu.my` |
| Student | `student2@student.uow.edu.my` |
| Student | `student3@student.uow.edu.my` |

## Running the clients

- Android: open `mobile-app/` in Android Studio and follow the [mobile setup guide](mobile-app/README.md). An Android emulator reaches the host backend at `http://10.0.2.2:5000/api/v1`.
- Browser test console: serve `static-deploy/` with any static HTTP server, then select the API base URL in the page.
- Web client: `web-interface/` is not implemented yet; its `.env.example` records the planned Vite API variable.
- Postman: import the collection and one environment from `postman/`, then follow the [recommended smoke order](postman/README.md).

## Development checks

Run backend validation and tests from `backend/`:

```bash
npm ci
npm run lint
npx prisma validate
npm test
```

For the complete cross-client checklist, see [Local integration guide](docs/LOCAL_INTEGRATION_GUIDE.md).

## Project documentation

- [API contract](docs/API_CONTRACT.md) — request/response contract shared by clients
- [Local integration guide](docs/LOCAL_INTEGRATION_GUIDE.md) — backend, web, and mobile test flow
- [Team handoff](docs/TEAM_HANDOFF.md) — responsibilities and shared conventions
- [Development-to-Azure deployment](docs/DEV_TO_AZURE_DEPLOYMENT.md) — branch and deployment workflow
- [Azure sandbox manual deployment](docs/AZURE_SANDBOX_MANUAL_DEPLOY.md) — manual Azure procedure
- [Burp security test playbook](docs/BURP_SECURITY_TEST_PLAYBOOK.md) — security testing workflow
- [Merged schema test guide](docs/TEST_MERGED_SCHEMA.md) — database verification notes

## Team conventions

- Use `/api/v1` as the API base path.
- Send JWTs as `Authorization: Bearer <token>` for protected routes.
- Keep environment-specific URLs and secrets out of committed source.
- Update `docs/API_CONTRACT.md` whenever an endpoint changes.
- Integrate on `dev`; merge to `main` only after the local integration checks pass.

## Troubleshooting

- If `/health` works but `/db-test` fails, inspect `docker compose logs postgres backend` and confirm the database is healthy.
- If uploads fail locally, confirm the `azurite` service is running and the backend is using `backend/.env.docker`.
- If a phone cannot connect, use the computer's LAN IP instead of `localhost`, keep both devices on the same network, and allow port `5000` through the firewall.
- If browser requests are blocked by CORS, set `FRONTEND_URL` to the exact frontend origin and restart the backend.
