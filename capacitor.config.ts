import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kalp.sciencesandbox",
  appName: "KMRAL Science Sandbox",
  webDir: "dist/kmrl-mobile",
  server: {
    androidScheme: "https",
  },
};

export default config;
