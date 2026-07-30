# Local Integration Guide

Use this guide before pushing the `dev` branch toward deployment.

## Team Decision

For this student project, the team will use two main branches:

```text
dev  - active integration branch
main - stable deployment branch
```

This is fine if `dev` is treated seriously. The rule is:

```text
Only merge dev into main after local integration passes.
```

## Local Integration Flow

1. Pull the latest `dev`.
2. Start the backend stack.
3. Run backend smoke checks with Postman.
4. Point web interface to local backend.
5. Point mobile app to local backend.
6. Test the same user flows on web and mobile.
7. Fix integration issues in `dev`.
8. When stable, merge `dev` into `main`.
9. Deploy `main` to Azure.

## Backend Local Setup

From the project root:

```bash
docker compose up -d --build
```

Expected backend URL:

```text
http://localhost:5000/api/v1
```

Check:

```text
GET http://localhost:5000/api/v1/health
GET http://localhost:5000/api/v1/db-test
```

The local Compose stack starts backend, PostgreSQL, and Azurite for file uploads. Web and mobile should run separately and point to this backend URL.

## Postman Smoke Test

Import:

```text
postman/postman_collection.json
postman/postman_environment_local.json
```

Run these first:

```text
Health / Backend Health
Health / Database Check
Auth / Login Admin
Auth / Login Student 1
Missions / List Missions - Student Active
Content / List Content - Student Published
Quizzes / List Quizzes
Progress / List My Progress
Badges / Badge Progress - Student
Points / My Points - Student
```

Do not start debugging frontend or mobile until these pass.

## Web Integration

The web interface should use an environment variable for the API base URL.

Example:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Minimum web flow to test:

```text
Login as student
View missions
Submit mission
View content
Open quiz
Submit quiz attempt
View progress/badges/points
Logout
```

Admin flow:

```text
Login as admin
Create or edit mission
Review student submission
Create or edit content
Create or edit quiz
Create or edit badge
View points/events
```

## Mobile Integration

Mobile must not use `localhost` unless the backend is running on the device itself.

Android emulator:

```text
http://10.0.2.2:5000/api/v1
```

Physical phone:

```text
http://LAPTOP_IP:5000/api/v1
```

The laptop and phone must be on the same Wi-Fi. Windows Firewall may need to allow port `5000`.

Minimum mobile flow to test:

```text
Login as student
View missions
Join mission
Submit mission
Upload mission proof
View content
Open quiz
Submit quiz attempt
View progress/badges/points
Logout
```

## Integration Checklist Before Main

Backend:

```text
[ ] docker compose starts cleanly
[ ] /health passes
[ ] /db-test passes
[ ] migrations and seed run
[ ] Postman local smoke tests pass
[ ] seed accounts work
[ ] no breaking API changes undocumented
```

Web:

```text
[ ] API base URL is configurable
[ ] login stores token
[ ] protected requests send Bearer token
[ ] 401 redirects/logs out user
[ ] student flow works
[ ] admin flow works if web has admin screens
```

Mobile:

```text
[ ] API base URL is configurable
[ ] emulator uses 10.0.2.2 or physical phone uses laptop IP
[ ] login stores token
[ ] protected requests send Bearer token
[ ] mission join creates ONGOING submission
[ ] mission proof upload works
[ ] auto-approved upload submission awards points
[ ] student flow works
```

Git:

```text
[ ] all teammates pulled latest dev
[ ] no uncommitted important changes
[ ] dev has latest backend, web, and mobile integration fixes
[ ] API_CONTRACT.md is updated
[ ] README or team notes link to these docs
```

## Good Student-Project Shortcut

You can skip a separate Azure staging environment if local integration is very solid and the project deadline is tight.

The clean compromise:

```text
local dev testing -> merge dev into main -> deploy main to Azure -> run production smoke test immediately
```

If production smoke test fails, fix in `dev`, retest locally, merge to `main`, and redeploy.
