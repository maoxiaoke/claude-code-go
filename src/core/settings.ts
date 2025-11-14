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
		throw new Error(`无法解析 JSON: ${file} ${String((e as Error)?.message ?? e)}`);
	}
}

export function writeJson(file: string, data: unknown): void {
	const content = JSON.stringify(data, null, 2);
	fs.writeFileSync(file, content, 'utf8');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

// 深合并：同键覆盖；数组整体覆盖（以 source 覆盖 target）
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
	const paths = getPaths(target, baseDir);
	const commonCfg = (readJson<Record<string, unknown>>(paths.common) ?? {}) as Record<
		string,
		unknown
	>;

	if (!fs.existsSync(paths.specialized)) {
		consola.info(
			`未找到专用配置 ${chalk.cyan(path.basename(paths.specialized))}，将打开编辑器创建该文件…`,
		);
		const initial = '{}\n';
		const createdContent = await openInEditor(initial, paths.specialized);
		try {
			const parsed = JSON.parse(createdContent);
			if (!isPlainObject(parsed)) {
				throw new Error('配置应为 JSON 对象');
			}
			writeJson(paths.specialized, parsed);
			consola.success(`已创建 ${chalk.green(path.basename(paths.specialized))}。继续合并…`);
		} catch (e) {
			throw new Error(`创建失败：${String((e as Error)?.message ?? e)}`);
		}
	}

	const specializedCfg = readJson<Record<string, unknown>>(paths.specialized) ?? {};
	const merged = mergeConfigs(commonCfg, specializedCfg);
	writeJson(paths.common, merged);
	consola.success(
		`合并完成，已更新 ${chalk.green(path.relative(os.homedir(), paths.common) || paths.common)}`,
	);

	// 将 env 注入子进程环境变量（若为对象）
	let envFromConfig: Record<string, string> | undefined;
	const maybeEnv = (merged as Record<string, unknown>)['env'];
	if (isPlainObject(maybeEnv)) {
		envFromConfig = {};
		for (const [k, v] of Object.entries(maybeEnv)) {
			envFromConfig[k] = String(v);
		}
	}

	const cmd = 'claude'; // 使用目标作为命令名（'claude' 或 'k2'）
	consola.start(`启动 ${chalk.cyan(cmd)} …`);
	const child = spawn(cmd, argv, {
		stdio: 'inherit',
		shell: false,
		env: { ...process.env, ...envFromConfig },
	});
	child.on('exit', (code, signal) => {
		if (typeof code === 'number') {
			if (code === 0) {
				consola.success(`${cmd} 退出码 0`);
			} else {
				consola.error(`${cmd} 退出码 ${code}`);
			}
		} else {
			consola.warn(`${cmd} 由于信号 ${String(signal)} 终止`);
		}
	});
	child.on('error', (err) => {
		consola.error(`无法启动命令 ${chalk.cyan(cmd)}：${String(err?.message ?? err)}`);
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
				throw new Error('配置应为 JSON 对象');
			}
			writeJson(commonPath, parsed);
			return commonPath;
		} catch (e) {
			throw new Error(`保存失败：${String((e as Error)?.message ?? e)}`);
		}
	}

	if (!target) {
		throw new Error('未指定目标，且未选择 --common。');
	}
	const { specialized } = getPaths(target, baseDir);
	const initial =
		(fs.existsSync(specialized) ? fs.readFileSync(specialized, 'utf8') : '{\n}\n') ?? '{\n}\n';
	const edited = await openInEditor(initial, specialized);
	try {
		const parsed = JSON.parse(edited);
		if (!isPlainObject(parsed)) {
			throw new Error('配置应为 JSON 对象');
		}
		writeJson(specialized, parsed);
		return specialized;
	} catch (e) {
		throw new Error(`保存失败：${String((e as Error)?.message ?? e)}`);
	}
}
