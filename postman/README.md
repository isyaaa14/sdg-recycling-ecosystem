# SDG Engagement Backend Postman Tests

This folder is the canonical Postman workspace for the current backend API.

## Files

- `postman_collection.json` - Postman collection.
- `postman_environment_local.json` - local environment for `http://localhost:5000`.
- `postman_environment_shared.json` - shared/deployed environment template.
- `sample_payloads.json` - copy-paste request bodies for manual tests.

## Import

1. Import `postman_collection.json` into Postman.
2. Import either `postman_environment_local.json` or `postman_environment_shared.json`.
3. Select the imported environment before running requests.
4. Start the backend and seed demo data before running the smoke flow.

If Postman shows `getaddrinfo ENOTFOUND {{baseurl}}{{apiprefix}}`, the base URL variables did not resolve. Select the imported environment and confirm either `baseUrl`/`apiPrefix` or the lowercase aliases `baseurl`/`apiprefix` are enabled.

## Active Smoke Order

Run these requests in order for the currently mounted routes:

1. `Health / Backend Health`
2. `Health / Database Check`
3. `Auth / Login Admin`
4. `Auth / Login Student 1`
5. `Student Flow / List Missions`
6. `Student Flow / Submit Mission`
7. `Student Flow / List Content`
8. `Admin Flow / Create Content`
9. `Admin Flow / Submission Queue`
10. `Admin Flow / Review Submission`

## Current Runnable Scope

The active backend currently mounts:

- `/api/v1/auth`
- `/api/v1/missions`
- `/api/v1/submissions`
- `/api/v1/content`

Requests for quizzes, progress, badges, and analytics are left in their original Student/Admin flow locations. They are useful planning references, but they should be expected to return `404` until backend routes are added.

## Test Payloads

Use `sample_payloads.json` when you want a different request body. Copy one payload into the matching Postman request body, then run the request.

Recommended manual checks:

- Create a published content item.
- Create a draft content item.
- Repeat the duplicate-title content payload to observe the current duplicate slug behavior.
- Submit a mission with text-only proof.
- Submit a mission with quantity proof.
- Approve and reject a submission using the review payloads.

## Known Backend Notes To Fix Later

- `GET /api/v1/content` currently supports `tag`, while an eventual broader search may use `q`.
- Content update is currently mounted as `PUT /api/v1/content/:id`; README/backend contract should later be reconciled with `PATCH`.
- Duplicate content titles can generate duplicate slugs. The backend should later return a clean conflict response instead of leaking a Prisma unique constraint failure.
