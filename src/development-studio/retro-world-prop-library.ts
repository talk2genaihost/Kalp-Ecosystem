export type RetroWorldId = "SURFACE"|"UNDERWATER"|"DESERT"|"SNOW"|"URBAN"|"SPACE";

export interface RetroWorldPropProfile {
  id: RetroWorldId;
  label: string;
  environmentTokens: string[];
  allowedProps: string[];
  suppressedProps: string[];
  visualRules: string[];
  movementNormalization: Record<string,string>;
}

export const RETRO_WORLD_PROP_LIBRARY: Record<RetroWorldId, RetroWorldPropProfile> = {
  SURFACE: {
    id:"SURFACE", label:"Surface / Land",
    environmentTokens:["surface","land","jungle","forest","road","city","urban","desert","snow","ground"],
    allowedProps:["military jeep","cargo truck","barricade","radio tower","fuel drums","roadblocks","bridges","vehicles","buildings","trees"],
    suppressedProps:["underwater coral","submerged rocks","deep-sea pressure effects","aquatic current channels"],
    visualRules:["Use sky, clouds, horizon, atmospheric weather and land-based set dressing when the scene is surface-based."],
    movementNormalization:{}
  },
  UNDERWATER: {
    id:"UNDERWATER", label:"Underwater / Aquatic",
    environmentTokens:["underwater","submerged","aquatic","ocean","sea","undersea","dive","diving"],
    allowedProps:["coral","submerged rocks","underwater barriers","current channels","sun rays through water","bubbles","aquatic plants","underwater ruins","sea floor"],
    suppressedProps:["sky","clouds","horizon sky","helicopter","airplane","military jeep","cargo truck","radio tower","fuel drums","dry road","dry asphalt","surface-only roadblocks"],
    visualRules:["No open sky or sky-only props inside the submerged camera volume.","Surface vehicles and aircraft are suppressed unless explicitly framed above the water surface.","Use underwater particulate matter, caustic light, bubbles, aquatic plants, currents and submerged structures instead."],
    movementNormalization:{run:"swim",sprint:"underwater sprint",walk:"underwater propulsion",jump:"vertical underwater kick"}
  },
  DESERT: {
    id:"DESERT", label:"Desert",
    environmentTokens:["desert","sand","dune","sandstorm"],
    allowedProps:["dunes","sandbags","desert vehicles","ruins","dry rocks","dust","tents"],
    suppressedProps:["snow banks","coral","submerged rocks","underwater currents"],
    visualRules:["Use desert sky and dust only; do not mix aquatic or snow set dressing."],
    movementNormalization:{}
  },
  SNOW: {
    id:"SNOW", label:"Snow / Frozen",
    environmentTokens:["snow","snowy","ice","frozen","arctic"],
    allowedProps:["snow banks","ice","frozen structures","snow vehicles","ice barriers","frost"],
    suppressedProps:["coral","sand dunes","dry tropical mud","underwater currents"],
    visualRules:["Use cold atmospheric effects and frozen terrain consistently."],
    movementNormalization:{}
  },
  URBAN: {
    id:"URBAN", label:"Urban / City",
    environmentTokens:["urban","city","street","building","metro"],
    allowedProps:["buildings","streets","vehicles","signage","streetlights","barriers","rooftops"],
    suppressedProps:["coral","deep jungle props","desert dunes","snow banks"],
    visualRules:["Use architectural and street-level props consistent with a city environment."],
    movementNormalization:{}
  },
  SPACE: {
    id:"SPACE", label:"Space / Zero-G",
    environmentTokens:["space","orbit","zero-g","zero gravity","spaceship"],
    allowedProps:["spacecraft","airlock","debris","stars","planets","station modules"],
    suppressedProps:["sky","clouds","road","trees","dry land","underwater currents"],
    visualRules:["Do not use Earth surface sky or ground props unless explicitly inside a spacecraft or planetary surface scene."],
    movementNormalization:{run:"zero-g propulsion",sprint:"zero-g propulsion",jump:"zero-g push-off"}
  }
};

export function resolveRetroWorldPropProfile(intent:string): RetroWorldPropProfile {
  const text=intent.toLowerCase();
  if(/underwater|submerged|aquatic|ocean|sea|undersea|dive|diving/.test(text)) return RETRO_WORLD_PROP_LIBRARY.UNDERWATER;
  if(/space|orbit|zero[- ]?g|zero gravity|spaceship/.test(text)) return RETRO_WORLD_PROP_LIBRARY.SPACE;
  if(/desert|sandstorm|dune|sand/.test(text)) return RETRO_WORLD_PROP_LIBRARY.DESERT;
  if(/snow|snowy|ice|frozen|arctic/.test(text)) return RETRO_WORLD_PROP_LIBRARY.SNOW;
  if(/urban|city|street|building|metro/.test(text)) return RETRO_WORLD_PROP_LIBRARY.URBAN;
  return RETRO_WORLD_PROP_LIBRARY.SURFACE;
}
