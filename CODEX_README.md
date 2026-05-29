# RN Perf For Codex

The repository root is a Codex plugin. Codex reads `.codex-plugin/plugin.json` and the shared `skills/` directory, so this repo can be used directly as the plugin path while developing.

## Install From NPM

```bash
npm install -g rn-perf-plugin
rn-perf-plugin install codex --force
```

`rn-perf-plugin install codex --force` writes the plugin to `~/.agents/plugins/plugins/rn-perf` and creates or updates `~/.agents/plugins/marketplace.json`.

For manual setup, print the package path:

```bash
rn-perf-plugin path codex
```

## Invocation

Codex uses the shared skill names in prompts:

```text
Use $rn-perf-full-app-test to audit my React Native app.
Use $rn-perf-analyze-js-bundle to find bundle bloat.
Use $rn-perf-measure-tti to add startup timing.
Use $rn-perf-bottom-sheet to fix bottom sheet jank.
Use $rn-perf-android-16kb-alignment to check Android release compatibility.
```

For broad audits, regressions, unclear performance symptoms, or multi-area changes, start with `$rn-perf-full-app-test`.

## Project AGENTS.md Guidance

Add this section to the target React Native project's `AGENTS.md` to make RN Perf skill usage mandatory during Codex work:

```md
## Mandatory RN Perf Skills

This is a React Native project. During development, every agent must use the RN Perf plugin skills as mandatory project guidance for performance-sensitive work.

Required workflow:

- Before changing React Native code, check whether the task touches startup, rendering, navigation, lists, animations, gestures, forms, state, native modules, assets, bundling, memory, app size, or profiling.
- If it does, use the relevant `rn-perf-*` skill before implementing the change.
- For broad audits, regressions, unclear performance symptoms, or multi-area changes, start with `rn-perf-full-app-test` and follow the specialist skills it dispatches to.
- For feature development, proactively apply every relevant skill from the map below. If a skill is skipped because it is not applicable, state that briefly in the implementation notes.
- Measure first, optimize second, then re-measure with the same device, build mode, interaction, and metric whenever the task affects runtime performance.
- Do not recommend speculative memoization, dependency-array changes, stale-closure fixes, or library swaps without profiler evidence, a reproducible bug, or a skill-specific rule that justifies it.
- Treat native SDKs, new packages, Re.Pack configuration, remote chunks, and release build settings as supply-chain or release-risk changes. Review them carefully before applying.

Mandatory skill map:

- Full audit: `rn-perf-full-app-test`
- Startup and responsiveness: `rn-perf-measure-tti`, `rn-perf-disable-bundle-compression`
- FPS and jank: `rn-perf-measure-js-fps`, `rn-perf-profile-js-react`, `rn-perf-profile-native`
- Lists and scrolling: `rn-perf-virtualized-lists`
- Animations and gestures: `rn-perf-animations-reanimated`, `rn-perf-bottom-sheet`
- Text input and forms: `rn-perf-uncontrolled-components`
- Rendering and state: `rn-perf-react-compiler`, `rn-perf-concurrent-react`, `rn-perf-atomic-state-management`
- JavaScript memory: `rn-perf-hunt-js-memory-leaks`
- Native memory and threading: `rn-perf-hunt-native-memory-leaks`, `rn-perf-native-memory-mgmt`, `rn-perf-threading-model`
- Native modules and platform code: `rn-perf-native-modules-faster`, `rn-perf-platform-differences`, `rn-perf-view-flattening`
- Bundle analysis and dependency size: `rn-perf-analyze-js-bundle`, `rn-perf-library-size`
- App size and release shrinking: `rn-perf-analyze-app-bundle`, `rn-perf-r8-android-shrink`, `rn-perf-native-assets-folder`
- Metro, Re.Pack, and code loading: `rn-perf-tree-shaking`, `rn-perf-avoid-barrel-exports`, `rn-perf-rn-sdks-over-web`, `rn-perf-remote-code-loading`
- Android release compatibility: `rn-perf-android-16kb-alignment`
- Tooling and traces: `rn-perf-react-native-devtools`, `rn-perf-xcode-instruments`, `rn-perf-android-studio-profiler`, `rn-perf-perfetto-traces`, `rn-perf-flashlight-android`, `rn-perf-simulator-tooling`
```
