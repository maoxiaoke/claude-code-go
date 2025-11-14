#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import consola from 'consola';
import { createRequire } from 'node:module';
import { applySelection, editConfig, type Target } from './core/settings.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description?: string };

const program = new Command();

program
	.name('claude-go')
	.description(pkg.description ?? 'claude-go CLI')
	.usage('[command] [options]')
	.version(pkg.version, '-v, --version', '显示版本号');

program.allowUnknownOption(true);

program.addHelpText(
	'after',
	`\n别名: ${chalk.cyan('cg')}\n\n提示: 本工具尚未实现功能，当前仅为命令骨架与开发脚手架。`,
);

program.argument('[argv...]', '透传到子进程的参数').action(async () => {
	try {
		const { target } = await prompts({
			type: 'select',
			name: 'target',
			message: '选择要启动的目标：',
			choices: [
				{ title: 'claude', value: 'claude' },
				{ title: 'k2', value: 'k2' },
			],
			initial: 0,
		});
		if (!target) {
			consola.info('已取消。');
			return;
		}
		// Commander 对未知选项宽容，但为确保“全量透传”，直接使用原始 argv（去掉前两个元素）
		const forward = process.argv.slice(2);
		await applySelection(target as Target, forward);
	} catch (err: unknown) {
		consola.error(chalk.red(`错误: ${String((err as Error)?.message ?? err)}`));
		process.exit(1);
	}
});

program
	.command('edit')
	.argument('[target]', '目标：claude 或 k2')
	.option('--common', '编辑公共配置 (~/.claude/settings.json)')
	.description('编辑配置文件（默认编辑专用配置，或使用 --common 编辑公共配置）')
	.action(async (maybeTarget: string | undefined, opts: { common?: boolean }) => {
		try {
			if (opts?.common) {
				const file = await editConfig(null, { common: true });
				consola.success(`已保存公共配置：${chalk.green(file)}`);
				return;
			}
			let target = maybeTarget as Target | undefined;
			if (target !== 'claude' && target !== 'k2') {
				const resp = await prompts({
					type: 'select',
					name: 'target',
					message: '选择要编辑的目标配置：',
					choices: [
						{ title: 'claude', value: 'claude' },
						{ title: 'k2', value: 'k2' },
					],
					initial: 0,
				});
				target = resp?.target as Target | undefined;
			}
			if (!target) {
				consola.info('已取消。');
				return;
			}
			const file = await editConfig(target, { common: false });
			consola.success(`已保存 ${chalk.cyan(target)} 专用配置：${chalk.green(file)}`);
		} catch (err: unknown) {
			consola.error(chalk.red(`错误: ${String((err as Error)?.message ?? err)}`));
			process.exit(1);
		}
	});

program.parseAsync(process.argv).catch((err) => {
	consola.error(chalk.red(`错误: ${String(err?.message ?? err)}`));
	process.exit(1);
});
