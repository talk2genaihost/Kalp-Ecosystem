import type { ExperimentDefinition } from "./experiment-library.js";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const card = (experiment: ExperimentDefinition): string => `
  <article class="kmrl-experiment-card" data-domain="${experiment.domain.toLowerCase()}">
    <div class="kmrl-experiment-card__domain">${escapeHtml(experiment.domain)}</div>
    <h3>${escapeHtml(experiment.title)}</h3>
    <p>${escapeHtml(experiment.objective)}</p>
    <div class="kmrl-experiment-card__meta">${experiment.level} · ${experiment.steps.length} guided steps</div>
    <button type="button" data-action="start-experiment" data-experiment-id="${escapeHtml(experiment.id)}">Start experiment</button>
  </article>`;

export function renderExperimentLibrary(experiments: readonly ExperimentDefinition[]): string {
  const chemistry = experiments.filter((item) => item.domain === "CHEMISTRY");
  const physics = experiments.filter((item) => item.domain === "PHYSICS");
  return `
    <main class="kmrl-experiment-library" aria-label="KMRL Experiment Library">
      <header class="kmrl-experiment-library__header">
        <div>
          <div class="kmrl-kicker">KMRL · LEARNING LAB</div>
          <h1>Experiment Library</h1>
          <p>Choose a guided Chemistry or Physics experiment and launch it into the Sandbox.</p>
        </div>
      </header>
      <section aria-labelledby="chemistry-heading">
        <h2 id="chemistry-heading">Chemistry</h2>
        <div class="kmrl-experiment-grid">${chemistry.map(card).join("")}</div>
      </section>
      <section aria-labelledby="physics-heading">
        <h2 id="physics-heading">Physics</h2>
        <div class="kmrl-experiment-grid">${physics.map(card).join("")}</div>
      </section>
    </main>`;
}
