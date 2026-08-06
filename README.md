# SDG Recycling Ecosystem

Team integration notes are in `docs/`.

Start here:

- `docs/TEAM_HANDOFF.md` - quick sharing note for backend, web, and mobile teammates
- `docs/API_CONTRACT.md` - shared backend API contract
- `docs/LOCAL_INTEGRATION_GUIDE.md` - local backend, web, and mobile integration checklist
- `docs/DEV_TO_AZURE_DEPLOYMENT.md` - simple `dev` to `main` to Azure deployment flow

Postman files:

- `postman/postman_collection.json`
- `postman/postman_environment_local.json`
- `postman/postman_environment_shared.json`
- `postman/sample_payloads.json`

The Postman collection is shared across environments. Keep team-safe local and
shared environment exports in `postman/`. Personal sandbox exports and other
private testing files can live in ignored `offline/`.

Backend local base URL:

```text
http://localhost:5000/api/v1
```

Android emulator base URL:

```text
http://10.0.2.2:5000/api/v1
```
