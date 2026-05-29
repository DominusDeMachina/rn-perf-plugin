# Install

This package is configured to publish as `rn-perf-plugin` and contains the shared RN Perf skills plus platform adapters for Codex, Claude Code, and Gemini CLI.

## Requirements

- Node.js 18 or newer
- npm
- Codex, Claude Code, or Gemini CLI for the platform you want to use

## Install From NPM

```bash
npm install -g rn-perf-plugin
rn-perf-plugin path root
```

After the global install, use the platform-specific setup guide:

| Platform | Setup guide |
|---|---|
| Codex | [CODEX_README.md](./CODEX_README.md) |
| Claude Code | [CLAUDE_README.md](./CLAUDE_README.md) |
| Gemini CLI | [GEMINI_README.md](./GEMINI_README.md) |

If the package has not been published yet, npm-backed install paths will fail because `npm view rn-perf-plugin` returns 404.

## Local Development

From the repository root:

```bash
npm run build
npm run check
```

The build step regenerates `gemini-extension/` from `skills/`. The check step validates package metadata, generated Gemini commands, and the expected skill count.

For local platform smoke tests:

```bash
rn-perf-plugin path codex
claude --plugin-dir "$(pwd)"
gemini extensions install "$(pwd)/gemini-extension"
```

See the platform README files for complete setup and invocation details.

## Publish To NPM

Run the package checks before publishing:

```bash
npm run build
npm run check
npm pack --dry-run
npm publish --access public
```

After publishing, verify the installed package:

```bash
npm install -g rn-perf-plugin
rn-perf-plugin path root
rn-perf-plugin path claude
rn-perf-plugin path gemini
rn-perf-plugin path claude-marketplace
```

The package should support:

- Codex via `rn-perf-plugin install codex --force`
- Claude Code via `claude --plugin-dir "$(rn-perf-plugin path claude)"` or marketplace install
- Gemini CLI via `rn-perf-plugin install gemini --force` or `gemini extensions install "$(rn-perf-plugin path gemini)"`
