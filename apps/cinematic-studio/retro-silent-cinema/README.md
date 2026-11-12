# KALP Retro Silent Cinema Engine (RSCE-001)

Universal narrative-to-silent-cinema transformation module for KALP Cinematic Studio.

## Runtime
- GET /api/retro-silent-cinema — module health and capabilities.
- POST /api/retro-silent-cinema — transform a story, script, event, scene or product brief into a production blueprint.

Example request:
~~~json
{"request":"Recreate the Ramayana golden deer episode as a 1920s Indian silent mythological film.","genre":"auto","format":"short-film","aspect_ratio":"4:3","style":"authentic-1920s-indian","characters":["Rama","Sita","Lakshmana","Maricha"]}
~~~

## Output
KALP-RETRO-SILENT-CINEMA-PLAN-1.0 includes genre and format classification, an eight-beat storyboard, visual acting direction, intertitles, monochrome image prompts, music policy, character continuity locks, edit instructions and validation status.

## Execution boundary
This version creates a provider-neutral blueprint and prompts. It does not claim that images or video have been rendered. Provider dispatch, asset ingestion, render status and rendered-output QA remain downstream integration work through CMSE-012/013/014/015.

## Options
Genres: auto, mythological, historical, romance, comedy, horror-mystery, action-adventure, drama, advertisement, documentary.
Formats: short-film, feature-film, social-reel, advertisement, scene-recreation.
Aspect ratios: 4:3, 16:9, 9:16.
Profiles: authentic-1920s-indian, indian-mythological, expressionist-1920s.

Dashboard: open retro-silent-cinema/index.html from the Cinematic Studio deployment.
