import { createKMRLModelRegistry } from "../learning/model-registry.js";
import { loadStemLabCatalog } from "../learning/excel-catalog-loader.js";
import { validateStemLabCatalog } from "../learning/excel-catalog-validator.js";
import { createDynamicExperimentRuntime } from "../learning/dynamic-experiment-runtime.js";
import { DynamicExperimentScreen } from "../learning/dynamic-experiment-screen.js";
import { CatalogExperimentLibraryScreen } from "../learning/catalog-experiment-library-screen.js";

const rootElement = document.getElementById("kmrl-app");
if (!(rootElement instanceof HTMLElement)) throw new Error("KMRL app root not found");
const root: HTMLElement = rootElement;

const CATALOG_URL = "./KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx";

let catalogPromise: ReturnType<typeof loadCatalog> | undefined;

async function loadCatalog() {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) throw new Error(`Science Lab catalog could not be loaded: HTTP ${response.status}`);
  const workbook = await response.arrayBuffer();
  const catalog = loadStemLabCatalog(workbook);
  const validation = validateStemLabCatalog(catalog);
  if (!validation.valid) {
    throw new Error(`Science Lab catalog is invalid: ${validation.errors.map((error) => error.message).join("; ")}`);
  }
  const registry = createKMRLModelRegistry(catalog);
  return { catalog, registry, validation };
}

function getCatalog() {
  catalogPromise ??= loadCatalog();
  return catalogPromise;
}

async function launch(experimentId: string): Promise<void> {
  const { catalog, registry, validation } = await getCatalog();
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);
  new DynamicExperimentScreen(runtime, { onBackToLibrary: showLibrary }).mount(root);
}

async function showLibrary(): Promise<void> {
  const { catalog, registry } = await getCatalog();
  new CatalogExperimentLibraryScreen({
    catalog,
    registry,
    onStartExperiment: launch,
  }).mount(root);
}

void showLibrary().catch((error) => {
  root.innerHTML = `<section class="kmrl-shell"><div class="kmrl-sync-alert" role="alert"><strong>Science Sandbox startup failed</strong><span>${String(error instanceof Error ? error.message : error)}</span></div></section>`;
});
