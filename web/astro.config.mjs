import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://atoms.convergent-systems.co",
  integrations: [react()],
  output: "static",
});
