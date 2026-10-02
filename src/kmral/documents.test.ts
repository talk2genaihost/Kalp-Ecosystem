import test from "node:test";
import assert from "node:assert/strict";
import type { KMRALDocumentPort } from "./documents.js";

test("KMRAL document contract remains provider-neutral", async () => {
  const documents: KMRALDocumentPort = {
    createReference: (input) => ({ id: "doc-1", ...input }),
    export: async (reference) => reference.uri,
  };

  const reference = documents.createReference({
    format: "PDF",
    uri: "memory://report-1",
    title: "Science Report",
  });

  assert.equal(reference.id, "doc-1");
  assert.equal(reference.format, "PDF");
  assert.equal(reference.title, "Science Report");
  assert.equal(await documents.export(reference), "memory://report-1");
});
