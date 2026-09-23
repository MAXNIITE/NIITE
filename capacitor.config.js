import { defineConfig } from "@capacitor/cli";

export default defineConfig({
  appId: "com.wellxai.niite",
  appName: "NIITE",
  webDir: ".",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f9d76",
  },
  server: {
    androidScheme: "https",
  },
});
