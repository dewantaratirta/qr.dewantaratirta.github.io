import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  base: "https://dewantaratirta.github.io/qr.dewantaratirta.github.io/",
  resolve: {
    alias: {
      $layout: path.resolve("./src/lib/layout"),
      $components: path.resolve("./src/lib/components"),
      $portfolio: path.resolve("./src/lib/portfolio"),
    },
  },
};

export default config;
