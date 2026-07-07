# Test Log

## Current backend scope

Working endpoints observed during testing:

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/db-test`
- `POST /api/v1/missions`

Not currently implemented in the running backend:

- auth routes
- mission listing routes
- content routes
- quiz routes
- badge routes
- analytics routes
- submission routes
- upload routes

## Notes for testing

- Use `postman/postman_environment_local.json` as the environment.
- The current `POST /api/v1/missions` request needs `createdById`.
- The current service rejects overlapping mission time windows for the same mission type.
- A successful created mission defaults to `status: "DRAFT"` unless code changes that behavior.

## Session checklist

- [ ] Start Docker with `docker compose up -d --build`
- [ ] Run root endpoint
- [ ] Run health endpoint
- [ ] Run db-test endpoint
- [ ] Run create mission with a non-overlapping date range
- [ ] Record failures caused by missing routes versus validation errors
