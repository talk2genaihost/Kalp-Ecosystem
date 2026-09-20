const fs = require("fs");
const path = require("path");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", name), "utf8"));
}

module.exports = async function handler(req, res) {
  const contract = load("csd-005-scene-intelligence.json");
  const universe = load("ramayana-universe-001.json");
  const relationships = load("csd-004-relationship-registry.json");

  if (req.method === "GET") {
    return res.status(200).json({
      engine_id: contract.engine_id,
      status: contract.status,
      pipeline: contract.pipeline,
      demo_test: contract.demo_test,
      downstream: contract.downstream
    });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const ids = Array.isArray(body.character_ids) ? body.character_ids : [];
    const arc = body.story_arc_id;
    const intent = body.narrative_intent;

    if (ids.length < 1 || ids.length > 5) {
      return res.status(400).json({ error: "character_ids must contain 1 to 5 characters." });
    }
    if (!arc || !intent) {
      return res.status(400).json({ error: "story_arc_id and narrative_intent are required." });
    }

    const known = new Set(universe.characters.map(c => c.id));
    const unknown = ids.filter(id => !known.has(id));
    if (unknown.length) {
      return res.status(400).json({ error: "Unknown character IDs.", unknown });
    }

    const selected = new Set(ids);
    const edges = relationships.relationship_graph.edges.filter(
      e => selected.has(e.from) && selected.has(e.to) &&
           (!body.story_arc_id || (e.arc_ids || []).includes(body.story_arc_id))
    );

    const characters = ids.map(id => {
      const c = universe.characters.find(x => x.id === id);
      return {
        id: c.id,
        name: c.name,
        role: c.primary_role,
        identity_seed: c.identity_seed,
        visual_seed: c.visual_seed,
        relevant_relationships: edges.filter(e => e.from === id || e.to === id)
      };
    });

    return res.status(200).json({
      engine_id: contract.engine_id,
      status: "SCENE_INTELLIGENCE_RESOLVED",
      scene_id: body.scene_id || "CSD5-RUNTIME-" + Date.now(),
      story_arc_id: arc,
      narrative_intent: intent,
      active_characters: characters,
      relationship_dynamics: edges,
      constraints: contract.inputs.constraints,
      director_rules: contract.director_rules,
      next_stage: "CSD-002-8-FRAME-DIRECTOR"
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
