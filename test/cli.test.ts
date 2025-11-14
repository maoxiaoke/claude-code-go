import { describe, it, expect } from "vitest";
import { run } from "../src/index.js";

describe("cli bootstrap", () => {
	it("exposes run() function for future core logic", async () => {
		expect(typeof run).toBe("function");
		await expect(run()).resolves.toBeUndefined();
	});
});

