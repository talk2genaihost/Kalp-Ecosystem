# KALP InspectFlow Mobile — Android APK

KMRAL mobile sandbox shell for the InspectFlow vertical slice.

## Local development

From this directory:

```bash
npm install
npx expo start
```

## Android APK

The `preview` EAS profile produces an installable Android `.apk`.

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile preview
```

The first EAS setup must create/link an EAS project and configure Android credentials. EAS can manage the Android keystore.

## CI

The EAS workflow is:

`.eas/workflows/build-android.yml`

The project must first be successfully initialized/configured on EAS. For GitHub-triggered builds, configure the Expo project and repository connection, or provide the required Expo authentication for the CI path.

## Current scope

This first APK shell validates the Android packaging path. The next integration step is to wire the existing KMRAL InspectionStore, offline queue, persistence adapter, sync service, and InspectFlow UI into the shell.

This build is a sandbox/test artifact, not a production release.
