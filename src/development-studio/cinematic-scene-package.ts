import { resolveCinematicScene, type CinematicSceneRequest, type CinematicResolution } from "./cinematic-knowledge-resolver";

export interface CinematicKnowledgePackage {
  contract: "KALP-CINEMATIC-KNOWLEDGE-PACKAGE-1.0";
  source: CinematicResolution["source"];
  request: CinematicSceneRequest;
  resolution: CinematicResolution;
  gate: {
    status: "PASS" | "FAIL";
    worldLocked: boolean;
    physicsResolved: boolean;
    progressionResolved: boolean;
    movementResolved: boolean;
    visualStyleResolved: boolean;
    effectsResolved: boolean;
    conflicts: string[];
  };
}

export function buildCinematicKnowledgePackage(request: CinematicSceneRequest): CinematicKnowledgePackage {
  const resolution = resolveCinematicScene(request);
  const effectsResolved = Object.values(resolution.effects).some(Boolean);
  const gate = {
    status: resolution.validation.status,
    worldLocked: Boolean(resolution.world.id),
    physicsResolved: resolution.physics.length > 0,
    progressionResolved: Boolean(resolution.progression.stage),
    movementResolved: request.movement ? Boolean(resolution.movement) : true,
    visualStyleResolved: Boolean(resolution.visualStyle),
    effectsResolved,
    conflicts: resolution.validation.conflicts
  } as CinematicKnowledgePackage["gate"];

  return {
    contract: "KALP-CINEMATIC-KNOWLEDGE-PACKAGE-1.0",
    source: resolution.source,
    request,
    resolution,
    gate
  };
}
