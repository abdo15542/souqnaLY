import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ly.souqna.app",
  appName: "سوقنا LY",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;
