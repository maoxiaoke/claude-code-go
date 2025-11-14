#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description?: string };

const program = new Command();

program
	.name('claude-go')
	.description(pkg.description ?? 'claude-go CLI')
	.usage('[command] [options]')
	.version(pkg.version, '-v, --version', '显示版本号');

program.addHelpText(
	'after',
	`\n别名: ${chalk.cyan('cg')}\n\n提示: 本工具尚未实现功能，当前仅为命令骨架与开发脚手架。`,
);

program.parseAsync(process.argv).catch((err) => {
	console.error(chalk.red(`错误: ${String(err?.message ?? err)}`));
	process.exit(1);
});
