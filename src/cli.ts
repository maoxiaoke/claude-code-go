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
	.version(pkg.version, '-v, --version', 'Show version');

program.allowUnknownOption(true);

program.argument('[argv...]', 'Arguments to pass through to claude').action(async () => {
	try {
		const { target } = await prompts({
			type: 'select',
			name: 'target',
			message: 'Select target to launch:',
			choices: [
				{ title: 'claude', value: 'claude' },
				{ title: 'k2', value: 'k2' },
			],
			initial: 0,
		});
		if (!target) {
			consola.info('Cancelled.');
			return;
		}
		// Commander tolerates unknown options, but to ensure full pass-through, use raw argv (drop the first two elements)
		const forward = process.argv.slice(2);
		await applySelection(target as Target, forward);
	} catch (err: unknown) {
		consola.error(chalk.red(`Error: ${String((err as Error)?.message ?? err)}`));
		process.exit(1);
	}
});

program
	.command('edit')
	.argument('[target]', 'Target: claude or k2')
	.option('--common', 'Edit common config (~/.claude/settings.json)')
	.description(
		'Edit configuration files (default edits specialized config; use --common to edit the common config)',
	)
	.action(async (maybeTarget: string | undefined, opts: { common?: boolean }) => {
		try {
			if (opts?.common) {
				const file = await editConfig(null, { common: true });
				consola.success(`Saved common config: ${chalk.green(file)}`);
				return;
			}
			let target = maybeTarget as Target | undefined;
			if (target !== 'claude' && target !== 'k2') {
				const resp = await prompts({
					type: 'select',
					name: 'target',
					message: 'Select target config to edit:',
					choices: [
						{ title: 'claude', value: 'claude' },
						{ title: 'k2', value: 'k2' },
					],
					initial: 0,
				});
				target = resp?.target as Target | undefined;
			}
			if (!target) {
				consola.info('Cancelled.');
				return;
			}
			const file = await editConfig(target, { common: false });
			consola.success(`Saved specialized config for ${chalk.cyan(target)}: ${chalk.green(file)}`);
		} catch (err: unknown) {
			consola.error(chalk.red(`Error: ${String((err as Error)?.message ?? err)}`));
			process.exit(1);
		}
	});

program.parseAsync(process.argv).catch((err) => {
	consola.error(chalk.red(`Error: ${String(err?.message ?? err)}`));
	process.exit(1);
});
