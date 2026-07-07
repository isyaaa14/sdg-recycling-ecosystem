# Current Progress Postman Notes

This folder is for tester-facing Postman assets that match the backend as it exists right now.

Use this folder when:

- the main collection is ahead of the code
- you want a smaller set of requests for smoke testing
- you want to keep tester notes separate from your partner's full API plan

Suggested workflow:

1. Keep the full team collection in `postman/postman_collection.json`.
2. Put temporary or current-state collections in this folder.
3. Add short notes after each test session so progress is easy to track.

Current files:

- `current-scope.postman_collection.json`: requests that match the currently implemented backend routes
- `TEST-LOG.md`: quick notes for what passed, failed, or is blocked
