const fs = require("fs");
const path = require("path");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", name), "utf8"));
}

module.exports = async function handler(req, res) {
  const registry = load("csd-004-relationship-registry.json");
  const universe = load("ramayana-universe-001.json");

  if (req.method === "GET") {
    const q = req.query || {};
    let edges = registry.relationship_graph.edges;
    if (q.character_id) {
      edges = edges.filter(e => e.from === q.character_id || e.to === q.character_id);
    }
    if (q.arc_id) {
      edges = edges.filter(e => (e.arc_ids || []).includes(q.arc_id));
    }
    return res.status(200).json({
      engine_id: registry.engine_id,
      status: registry.status,
      node_count: registry.relationship_graph.nodes.length,
      edge_count: edges.length,
      relationships: edges,
      retrieval_model: registry.retrieval_model
    });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const ids = Array.isArray(body.character_ids) ? body.character_ids : [];
    if (ids.length < 1 || ids.length > 5) {
      return res.status(400).json({ error: "character_ids must contain 1 to 5 characters." });
    }

    const known = new Set(universe.characters.map(c => c.id));
    const unknown = ids.filter(id => !known.has(id));
    if (unknown.length) {
      return res.status(400).json({ error: "Unknown character IDs.", unknown });
    }

    const selected = new Set(ids);
    const direct = registry.relationship_graph.edges.filter(
      e => selected.has(e.from) && selected.has(e.to)
    );
    const adjacent = registry.relationship_graph.edges.filter(
      e => (selected.has(e.from) && !selected.has(e.to)) ||
           (selected.has(e.to) && !selected.has(e.from))
    );

    const arcId = body.arc_id || null;
    const arcFiltered = arcId
      ? registry.relationship_graph.edges.filter(e => (e.arc_ids || []).includes(arcId) &&
          (selected.has(e.from) || selected.has(e.to)))
      : [];

    return res.status(200).json({
      engine_id: registry.engine_id,
      status: "RESOLVED",
      active_character_ids: ids,
      direct_relationships: direct,
      relevant_adjacent_relationships: adjacent,
      arc_relationships: arcFiltered,
      knowledge_constraints: registry.knowledge_model,
      scene_rule: registry.scene_resolution.hard_rule
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
