# KalpGyan Manthan Dashboard

A lightweight control dashboard for the KalpGyan Manthan MVP.

## Run locally

From the repository root, start the runtime:

```bash
npm run dev:kalpgyan-runtime
```

In a second terminal, start the dashboard:

```bash
npm run dev:kalpgyan
```

The dashboard calls `http://localhost:4310/api/production`. Override the runtime URL with `window.KALPGYAN_RUNTIME_URL` when embedding the dashboard elsewhere.

## Current boundary

The dashboard invokes the canonical TypeScript production runtime. PDF/EPUB extraction, model-backed discourse generation, real TTS, audio mastering, and persistent artifact storage remain explicit backend/provider boundaries and are not faked by the dashboard.
