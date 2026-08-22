# Web Interface

This directory is currently a placeholder for the future SDG Recycling web client. `index.html` is empty and there is no package manifest, source tree, or runnable build yet.

The intended frontend API setting is documented in `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Until the web client is implemented, use the browser integration console in [`../static-deploy/`](../static-deploy/README.md) or the shared [Postman collection](../postman/README.md) to exercise the backend.

When a web framework is added, update this README with its prerequisites, install/start/build/test commands, environment variables, and deployment process.
