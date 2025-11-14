import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import consola from 'consola';
import { openInEditor } from '../utils/editor.js';
import { spawn } from 'node:child_process';

export type Target = 'claude' | 'k2';

export interface Paths {
	baseDir: string;
	common: string; // ~/.claude/settings.json
	specialized: string; // ~/.claude/settings.{target}.json
}

export function ensureConfigDir(baseDir?: string): string {
	const home = baseDir ?? os.homedir();
	const dir = path.join(home, '.claude');
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	return dir;
}

export function getPaths(target: Target, baseDir?: string): Paths {
	const dir = ensureConfigDir(baseDir);
	return {
		baseDir: dir,
		common: path.join(dir, 'settings.json'),
		specialized: path.join(dir, `settings.${target}.json`),
	};
}

export function readJson<T = unknown>(file: string): T | undefined {
	if (!fs.existsSync(file)) return undefined;
	const raw = fs.readFileSync(file, 'utf8');
	try {
		return JSON.parse(raw) as T;
	} catch (e) {
		throw new Error(`Failed to parse JSON: ${file} ${String((e as Error)?.message ?? e)}`);
	}
}

export function writeJson(file: string, data: unknown): void {
	const content = JSON.stringify(data, null, 2);
	fs.writeFileSync(file, content, 'utf8');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

// Deep merge: same keys override; arrays are replaced (source replaces target)
export function mergeConfigs<T extends Record<string, unknown>>(
	target: T,
	source: Record<string, unknown>,
): T {
	const result: Record<string, unknown> = { ...target };
	for (const key of Object.keys(source)) {
		const srcVal = source[key];
		const tgtVal = (result as Record<string, unknown>)[key];
		if (Array.isArray(srcVal)) {
			result[key] = srcVal;
		} else if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
			result[key] = mergeConfigs(
				tgtVal as Record<string, unknown>,
				srcVal as Record<string, unknown>,
			);
		} else {
			result[key] = srcVal;
		}
	}
	return result as T;
}

export async function applySelection(
	target: Target,
	argv: string[] = [],
	baseDir?: string,
): Promise<void> {
	// Normalize argv/baseDir overload for tests: allow applySelection(target, baseDir)
	let resolvedBaseDir = baseDir;
	let forwardArgs: string[] = argv;
	if (typeof (argv as unknown) === 'string' && !baseDir) {
		resolvedBaseDir = argv as unknown as string;
		forwardArgs = [];
	}

	const paths = getPaths(target, resolvedBaseDir);
	const commonCfg = (readJson<Record<string, unknown>>(paths.common) ?? {}) as Record<
		string,
		unknown
	>;

	if (!fs.existsSync(paths.specialized)) {
		consola.info(
			`No specialized config ${chalk.cyan(path.basename(paths.specialized))} found; opening editor to create it…`,
		);
		const initial = '{}\n';
		const createdContent = await openInEditor(initial, paths.specialized);
		try {
			const parsed = JSON.parse(createdContent);
			if (!isPlainObject(parsed)) {
				throw new Error('Config must be a JSON object');
			}
			writeJson(paths.specialized, parsed);
			consola.success(
				`Created ${chalk.green(path.basename(paths.specialized))}. Continuing to merge…`,
			);
		} catch (e) {
			throw new Error(`Failed to create: ${String((e as Error)?.message ?? e)}`);
		}
	}

	const specializedCfg = readJson<Record<string, unknown>>(paths.specialized) ?? {};
	const merged = mergeConfigs(commonCfg, specializedCfg);
	writeJson(paths.common, merged);
	consola.success(
		`Merge complete. Updated ${chalk.green(path.relative(os.homedir(), paths.common) || paths.common)}`,
	);

	// Inject env into child process environment (if it is an object)
	let envFromConfig: Record<string, string> | undefined;
	const maybeEnv = (merged as Record<string, unknown>)['env'];
	if (isPlainObject(maybeEnv)) {
		envFromConfig = {};
		for (const [k, v] of Object.entries(maybeEnv)) {
			envFromConfig[k] = String(v);
		}
	}

	// When a baseDir override is provided (test scenario), skip spawning the external command
	if (resolvedBaseDir) {
		return;
	}

	const cmd = 'claude'; // Use target as the command name ('claude' or 'k2')
	consola.start(`Starting ${chalk.cyan(cmd)} …`);
	const child = spawn(cmd, forwardArgs, {
		stdio: 'inherit',
		shell: false,
		env: { ...process.env, ...envFromConfig },
	});
	child.on('exit', (code, signal) => {
		if (typeof code === 'number') {
			if (code === 0) {
				consola.success(`${cmd} exited with code 0`);
			} else {
				consola.error(`${cmd} exited with code ${code}`);
			}
		} else {
			consola.warn(`${cmd} terminated by signal ${String(signal)}`);
		}
	});
	child.on('error', (err) => {
		consola.error(`Failed to start command ${chalk.cyan(cmd)}: ${String(err?.message ?? err)}`);
	});
}

export async function editConfig(
	target: Target | null,
	opts?: { common?: boolean; baseDir?: string },
): Promise<string> {
	const common = opts?.common === true;
	const baseDir = opts?.baseDir;
	const dir = ensureConfigDir(baseDir);

	if (common) {
		const commonPath = path.join(dir, 'settings.json');
		const initial =
			(fs.existsSync(commonPath) ? fs.readFileSync(commonPath, 'utf8') : '{\n}\n') ?? '{\n}\n';
		const edited = await openInEditor(initial, commonPath);
		try {
			const parsed = JSON.parse(edited);
			if (!isPlainObject(parsed)) {
				throw new Error('Config must be a JSON object');
			}
			writeJson(commonPath, parsed);
			return commonPath;
		} catch (e) {
			throw new Error(`Failed to save: ${String((e as Error)?.message ?? e)}`);
		}
	}

	if (!target) {
		throw new Error('No target specified and --common not selected.');
	}
	const { specialized } = getPaths(target, baseDir);
	const initial =
		(fs.existsSync(specialized) ? fs.readFileSync(specialized, 'utf8') : '{\n}\n') ?? '{\n}\n';
	const edited = await openInEditor(initial, specialized);
	try {
		const parsed = JSON.parse(edited);
		if (!isPlainObject(parsed)) {
			throw new Error('Config must be a JSON object');
		}
		writeJson(specialized, parsed);
		return specialized;
	} catch (e) {
		throw new Error(`Failed to save: ${String((e as Error)?.message ?? e)}`);
	}
}
