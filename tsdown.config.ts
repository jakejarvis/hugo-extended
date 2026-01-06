import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*.ts"],
  outDir: "dist",
  clean: true,
  dts: {
    resolve: true,
  },
  unbundle: true,
  copy: ["src/_flags.json"],
});
