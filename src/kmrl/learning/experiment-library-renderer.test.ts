import assert from "node:assert/strict";
import test from "node:test";
import { getExperiment, listExperiments } from "./experiment-library.js";
import { renderExperimentLibrary } from "./experiment-library-renderer.js";

test("experiment library renderer shows chemistry and physics sections", () => {
  const html = renderExperimentLibrary(listExperiments());
  assert.match(html, /Chemistry/);
  assert.match(html, /Physics/);
  assert.match(html, /Heating Water/);
  assert.match(html, /Constant Force/);
});

test("experiment library renderer exposes stable start actions", () => {
  const experiment = getExperiment("physics-constant-force");
  const html = renderExperimentLibrary([experiment]);
  assert.match(html, /data-experiment-id="physics-constant-force"/);
  assert.match(html, /data-action="start-experiment"/);
});
