import { defineConfig } from "vite";

export default defineConfig({
  root: "apps/kmral-science-mobile",
  build: {
    outDir: "../../dist/kmrl-mobile",
    emptyOutDir: true,
    target: "es2022",
  },
});
