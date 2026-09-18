# KalpGyan Manthan Dashboard

A lightweight, dependency-free control dashboard for the KalpGyan Manthan MVP.

## Scope

- 10-stage Book-to-Discourse/Audio pipeline
- Book intake and duration controls
- Knowledge/discourse planning view
- Speaker style and voice registry view
- Production control
- QA/provenance status
- Runtime event view

## Run locally

From the repository root:

```bash
npm run dev:kalpgyan
```

The dashboard is currently a UI/control-plane prototype. It does not claim to perform PDF extraction, TTS, or MP3 mastering in-browser; those capabilities remain behind the canonical runtime/provider boundaries.
