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

## Project CLAUDE.md Guidance

Add project guidance to the target React Native app's `CLAUDE.md` when RN Perf should be mandatory:

```md
## Mandatory RN Perf Skills

This is a React Native project. For performance-sensitive work, use the RN Perf Claude Code plugin before implementation.

- Start broad audits, regressions, unclear performance symptoms, or multi-area changes with `/rn-perf:rn-perf-full-app-test`.
- For focused work, use the matching `/rn-perf:rn-perf-*` command before changing startup, rendering, navigation, lists, animations, gestures, forms, state, native modules, assets, bundling, memory, app size, or profiling code.
- Measure first, optimize second, then re-measure with the same device, build mode, interaction, and metric whenever runtime performance is affected.
- Do not recommend speculative memoization, dependency-array changes, stale-closure fixes, or library swaps without profiler evidence, a reproducible bug, or a skill-specific rule.
- Treat native SDKs, new packages, Re.Pack configuration, remote chunks, and release build settings as supply-chain or release-risk changes.
```
