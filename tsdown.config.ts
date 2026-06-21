import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*.ts"],
  outDir: "dist",
  clean: true,
  dts: true,
  unbundle: true,
  copy: ["src/generated"],
});
