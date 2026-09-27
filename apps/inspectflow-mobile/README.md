# InspectFlow Mobile

Expo/React Native reference runtime for the KMRAL inspection domain.

## Run

From this directory:

```bash
npm install
npx expo start
```

Use Expo Go or an Android/iOS simulator.

## Runtime boundary

The UI is intentionally thin. Domain logic and provider-specific implementations remain in KMRAL modules/adapters. The current shell uses local demo state; persistence, media capture and remote sync are the next wiring steps.

## End-to-end target

`InspectFlow UI → Inspection Domain Pack → KMRAL Data → Persistent Adapter → Offline Queue → Sync Adapter → Document/Media adapters`
