# Team Handoff

Use this as the quick sharing note for backend, web, and mobile teammates.

## Current Integration Plan

The team will integrate everything on `dev` first. Once local integration is solid, `dev` will be merged into `main`, and `main` will be deployed to Azure.

This avoids forcing everyone to learn Azure while they are still wiring features together.

## Backend Owner Provides

```text
API base URL
API_CONTRACT.md
Postman collection
Postman local/shared environments
seeded login accounts
known required environment variables
deployment notes
```

## Web Owner Provides

```text
web setup instructions
required frontend environment variables
student flow status
admin flow status
known UI/API issues
```

## Mobile Owner Provides

```text
mobile setup instructions
local API base URL instructions
student flow status
known device/emulator issues
```

## Everyone Agrees

```text
Use /api/v1 as the backend base path.
Use Bearer token auth after login.
Do not hardcode local-only URLs in committed code.
Do not hardcode seeded database IDs.
Update API_CONTRACT.md when an endpoint changes.
Test in Postman before blaming web or mobile.
Merge to main only after local integration passes.
```

## Useful Files

```text
docs/API_CONTRACT.md
docs/LOCAL_INTEGRATION_GUIDE.md
docs/DEV_TO_AZURE_DEPLOYMENT.md
postman/postman_collection.json
postman/postman_environment_local.json
postman/postman_environment_shared.json
backend/.env.example
```

## Recommended Team Message

```text
Hi team, backend integration docs are now in docs/.

Please read:
- docs/API_CONTRACT.md
- docs/LOCAL_INTEGRATION_GUIDE.md
- docs/DEV_TO_AZURE_DEPLOYMENT.md

For local testing, backend base URL is:
http://localhost:5000/api/v1

For Android emulator:
http://10.0.2.2:5000/api/v1

Use the Postman collection first to confirm backend is working before testing web/mobile.

We will integrate everything on dev. Once dev passes local integration, we merge dev into main and deploy main to Azure.
