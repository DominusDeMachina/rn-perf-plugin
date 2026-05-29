# RN Perf For Gemini CLI

Gemini CLI support is generated from the shared `skills/` source into `gemini-extension/`. Run `npm run build` after changing skills so the generated commands stay current.

## Install From NPM

After installing the npm package globally:

```bash
npm install -g rn-perf-plugin
gemini extensions install "$(rn-perf-plugin path gemini)"
```

If your Gemini CLI version does not support `gemini extensions install`, copy the generated extension into the user extension directory:

```bash
rn-perf-plugin install gemini --force
```

That writes the extension to `~/.gemini/extensions/rn-perf`.

## Local Development

From the repository root:

```bash
npm run build
gemini extensions install "$(pwd)/gemini-extension"
```

## Invocation

Gemini CLI commands are exposed without the plugin namespace:

```text
/rn-perf-full-app-test
/rn-perf-analyze-js-bundle
/rn-perf-measure-tti
/rn-perf-bottom-sheet
/rn-perf-android-16kb-alignment
```

For broad audits, regressions, unclear performance symptoms, or multi-area changes, start with `/rn-perf-full-app-test`.

## Project GEMINI.md Guidance

Add project guidance to the target React Native app's `GEMINI.md` when RN Perf should be mandatory:

```md
## Mandatory RN Perf Commands

This is a React Native project. For performance-sensitive work, use the RN Perf Gemini CLI extension before implementation.

- Start broad audits, regressions, unclear performance symptoms, or multi-area changes with `/rn-perf-full-app-test`.
- For focused work, use the matching `/rn-perf-*` command before changing startup, rendering, navigation, lists, animations, gestures, forms, state, native modules, assets, bundling, memory, app size, or profiling code.
- Measure first, optimize second, then re-measure with the same device, build mode, interaction, and metric whenever runtime performance is affected.
- Do not recommend speculative memoization, dependency-array changes, stale-closure fixes, or library swaps without profiler evidence, a reproducible bug, or a command-specific rule.
- Treat native SDKs, new packages, Re.Pack configuration, remote chunks, and release build settings as supply-chain or release-risk changes.
```
