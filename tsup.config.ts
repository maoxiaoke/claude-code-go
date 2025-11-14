import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts", "src/index.ts"],
	format: ["esm"],
	sourcemap: true,
	clean: true,
	dts: {
		entry: {
			index: "src/index.ts",
		},
	},
	target: "node20",
	minify: false,
	splitting: false,
	shims: false,
});

