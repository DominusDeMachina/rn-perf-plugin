# RN Perf For Claude Code

Claude Code can load this package directly as a plugin directory. The package includes Claude plugin metadata in `.claude-plugin/plugin.json` and the shared RN Perf skills in `skills/`.

## Local Development

From the repository root:

```bash
claude --plugin-dir "$(pwd)"
```

## Installed Package

After installing the npm package globally:

```bash
npm install -g rn-perf-plugin
claude --plugin-dir "$(rn-perf-plugin path claude)"
```

## Marketplace Install

For marketplace-style npm distribution, this repo includes `marketplaces/claude-npm/.claude-plugin/marketplace.json`.

After publishing the npm package:

```bash
claude plugin marketplace add "$(rn-perf-plugin path claude-marketplace)"
claude plugin install rn-perf@rn-perf-marketplace
```

## Invocation

Claude Code invokes plugin skills with the plugin namespace:

```text
/rn-perf:rn-perf-full-app-test
/rn-perf:rn-perf-analyze-js-bundle
/rn-perf:rn-perf-measure-tti
/rn-perf:rn-perf-bottom-sheet
/rn-perf:rn-perf-android-16kb-alignment
```

For broad audits, regressions, unclear performance symptoms, or multi-area changes, start with `/rn-perf:rn-perf-full-app-test`.

## Automatic Mandate Hook

Installing the plugin is enough to make the skills mandatory — no per-project setup needed. The plugin ships hooks (`hooks/hooks.json`, referenced from `.claude-plugin/plugin.json`) that detect whether the working project depends on `react-native` or `expo` and, if so, inject the RN Perf mandatory-skill policy into Claude's context:

- **SessionStart** (startup, resume, and post-compaction) — the policy is present from the first message and survives context compaction.
- **PreToolUse** on `Edit|Write|MultiEdit|NotebookEdit` — re-injected once per session right before the first file edit, so it is fresh exactly when code changes begin.

The hook is read-only: it never blocks or auto-approves a tool call, and it stays silent in non-React-Native projects. To opt out, disable or uninstall the plugin (`/plugin`), or remove the hook entries via `/hooks`.

## Project CLAUDE.md Guidance

The hook above already enforces the policy wherever the plugin is installed. Add the snippet below to the target app's `CLAUDE.md` only as reinforcement — for example, for teammates who use the skills from a checkout without installing the plugin:

```md
## Mandatory RN Perf Skills

This is a React Native project. For performance-sensitive work, use the RN Perf Claude Code plugin before implementation.

- Start broad audits, regressions, unclear performance symptoms, or multi-area changes with `/rn-perf:rn-perf-full-app-test`.
- For focused work, use the matching `/rn-perf:rn-perf-*` command before changing startup, rendering, navigation, lists, animations, gestures, forms, state, native modules, assets, bundling, memory, app size, or profiling code.
- Measure first, optimize second, then re-measure with the same device, build mode, interaction, and metric whenever runtime performance is affected.
- Do not recommend speculative memoization, dependency-array changes, stale-closure fixes, or library swaps without profiler evidence, a reproducible bug, or a skill-specific rule.
- Treat native SDKs, new packages, Re.Pack configuration, remote chunks, and release build settings as supply-chain or release-risk changes.
```
