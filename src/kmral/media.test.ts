import test from "node:test";
import assert from "node:assert/strict";
import type { KMRALMediaPort } from "./media.js";

test("KMRAL media contract remains provider-neutral", async () => {
  const media: KMRALMediaPort = {
    createReference: (input) => ({ id: "media-1", ...input }),
    resolve: async (reference) => reference.uri,
  };

  const reference = media.createReference({
    kind: "IMAGE",
    mimeType: "image/png",
    uri: "memory://image-1",
  });

  assert.equal(reference.id, "media-1");
  assert.equal(reference.kind, "IMAGE");
  assert.equal(await media.resolve(reference), "memory://image-1");
});
