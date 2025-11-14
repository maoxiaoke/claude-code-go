# claude-go (cg)

A quick launcher for Claude. It forwards arguments to Claude and manages per-target configs.

## Installation

```bash
npm i claude-go -g
```

## Usage

After installation, you can use:

- `claude-go --help`
- `cg --help`
- Launch and pass arguments through to the target command (interactive default selects `claude` or `k2`):
  - `cg --dangerously-skip-permissions`
  - `cg -- -dangerously-skip-permissions` (equivalent form)
- Edit configuration:
  - `cg edit claude` (edit `~/.claude/settings.claude.json`)
  - `cg edit k2` (edit `~/.claude/settings.k2.json`)
  - `cg edit --common` (edit common config `~/.claude/settings.json`)

Notes:

- Before running, the CLI deep-merges `settings.{target}.json` into `settings.json` and injects `env` (if present) into the child process environment.
- Unknown options are fully forwarded to the child process (no `--` required, but `--` also works).

## Development

```bash
# Install dependencies and initialize Husky hooks
npm i

# Local development (no bundling)
npm run dev -- --help

# Lint & format
npm run lint
npm run format

# Unit tests
npm test

# Build (bundle to dist/)
npm run build
```

## Project Structure

```
.
├── src/
│   ├── cli.ts       # CLI entry (with shebang)
│   └── index.ts     # Export core run() (to be implemented)
├── test/
│   └── cli.test.ts  # Example test
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc.json
├── .editorconfig
├── .gitignore
└── README.md
```

## License

MIT
