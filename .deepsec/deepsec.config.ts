import { defineConfig } from "deepsec/config";
import { generatedMatchersPlugin } from "./generated-matchers.js";

export default defineConfig({
  projects: [
    // <deepsec:projects-insert-above>
  ],
  plugins: [generatedMatchersPlugin],
});
