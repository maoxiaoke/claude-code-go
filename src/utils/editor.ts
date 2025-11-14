import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function pickEditor(): string {
	return process.env.VISUAL || process.env.EDITOR || 'vi';
}

export async function openInEditor(initialContent: string, targetPath: string): Promise<string> {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-edit-'));
	const tmpFile = path.join(tmpDir, path.basename(targetPath));
	fs.writeFileSync(tmpFile, initialContent, 'utf8');

	const editor = pickEditor();
	const result = spawnSync(editor, [tmpFile], { stdio: 'inherit', shell: true });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`${editor} exit code ${result.status}`);
	}
	const edited = fs.readFileSync(tmpFile, 'utf8');
	// Clean up temporary directory
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// ignore
	}
	return edited;
}
