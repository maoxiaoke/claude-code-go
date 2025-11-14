import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
	getPaths,
	mergeConfigs,
	writeJson,
	readJson,
	applySelection,
} from '../src/core/settings.js';

describe('settings core', () => {
	it('mergeConfigs should deep merge and override same keys, arrays replaced', () => {
		const base = { a: 1, b: { x: 1, y: [1, 2] }, c: [1, 2] };
		const override = { a: 2, b: { y: [3], z: 9 }, c: [9], d: true };
		const merged = mergeConfigs(base, override);
		expect(merged).toEqual({
			a: 2,
			b: { x: 1, y: [3], z: 9 },
			c: [9],
			d: true,
		});
	});

	it('getPaths returns expected files under baseDir', () => {
		const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-home-'));
		const paths = getPaths('claude', tmpHome);
		expect(paths.baseDir).toBe(path.join(tmpHome, '.claude'));
		expect(paths.common.endsWith('settings.json')).toBe(true);
		expect(paths.specialized.endsWith('settings.claude.json')).toBe(true);
	});

	it('applySelection merges specialized into common when specialized exists', async () => {
		const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-home-'));
		const paths = getPaths('k2', tmpHome);
		// prepare files
		writeJson(paths.common, { env: 'base', nested: { a: 1 } });
		writeJson(paths.specialized, { env: 'k2', nested: { b: 2 } });
		await applySelection('k2', tmpHome);
		const final = readJson<Record<string, unknown>>(paths.common)!;
		expect(final).toEqual({ env: 'k2', nested: { a: 1, b: 2 } });
	});
});
