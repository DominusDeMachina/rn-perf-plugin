# rn-perf

A multi-platform plugin bundling 36 React Native performance skills for Codex, Claude Code, and Gemini CLI, based on Callstack's *Ultimate Guide to React Native Optimization* (2025).

The orchestrator skill `rn-perf-full-app-test` surveys an app end-to-end and dispatches to the specific skill that owns each fix.

## NPM Package

The package name is `rn-perf-plugin`.

```bash
npm install -g rn-perf-plugin
```

The npm package ships:

- Codex plugin metadata in `.codex-plugin/plugin.json`
- Claude Code plugin metadata in `.claude-plugin/plugin.json`
- Shared Agent Skills in `skills/`
- Gemini CLI extension output in `gemini-extension/`
- A small helper CLI at `rn-perf-plugin`

## Use In Codex

The repository root is a Codex plugin. Codex reads `.codex-plugin/plugin.json` and the shared `skills/` directory, so this repo can be used directly as the plugin path while developing.

From npm, install it into the default personal Codex marketplace path:

```bash
rn-perf-plugin install codex --force
```

That writes the plugin to `~/.agents/plugins/plugins/rn-perf` and creates or updates `~/.agents/plugins/marketplace.json`.

## Use In Claude Code

For local development:

```bash
claude --plugin-dir "$(pwd)"
```

From an installed npm package:

```bash
claude --plugin-dir "$(rn-perf-plugin path claude)"
```

For marketplace-style npm distribution, this repo includes `marketplaces/claude-npm/.claude-plugin/marketplace.json`. After publishing the npm package:

```bash
claude plugin marketplace add "$(rn-perf-plugin path claude-marketplace)"
claude plugin install rn-perf@rn-perf-marketplace
```

Claude Code invokes plugin skills with the plugin namespace, for example `/rn-perf:rn-perf-full-app-test`.

## Use In Gemini CLI

Gemini CLI extensions are generated from the same `skills/` source into `gemini-extension/`.

With a Gemini CLI version that supports `gemini extensions`:

```bash
gemini extensions install "$(rn-perf-plugin path gemini)"
```

Or copy the extension into the user extension directory:

```bash
rn-perf-plugin install gemini --force
```

Gemini CLI commands are exposed as `/rn-perf-full-app-test`, `/rn-perf-analyze-js-bundle`, `/rn-perf-bottom-sheet`, and the rest of the `rn-perf-*` command set.

Useful starter prompts:

- `Use $rn-perf-full-app-test to audit my React Native app.`
- `Use $rn-perf-analyze-js-bundle to find bundle bloat.`
- `Use $rn-perf-measure-tti to add startup timing.`
- `Use $rn-perf-bottom-sheet to fix bottom sheet jank.`
- `Use $rn-perf-android-16kb-alignment to check Android release compatibility.`

## Enforce RN Perf In A Project AGENTS.md

Add this section to the target React Native project's `AGENTS.md` to make RN Perf skill usage mandatory during development:

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

## Audit Guardrails

Use the same loop for performance work: measure, optimize, re-measure, validate. The same device, release mode, interaction, and metric should be used before and after a fix.

Evidence requirements:

- Record baseline FPS, TTI, bundle size, app size, memory, or profiler evidence before suggesting a fix.
- Treat component count and tree depth as supporting context only.
- Check library versions before API-specific advice, especially FlashList, Reanimated, React Compiler, and Hermes Intl.
- Avoid speculative `useMemo`, `useCallback`, dependency-array, or stale-closure findings without profiler evidence or a reproducible bug.
- When a device automation or evidence-capture tool is available, use it for screenshots, logs, traces, and repeatable scenario evidence.

Security requirements:

- Review shell commands before running them and prefer pinned tooling in docs/CI.
- Do not pipe remote install scripts directly into a shell.
- Treat new packages, native SDKs, Re.Pack plugins, and remote chunks as supply-chain changes.
- For remote code loading, use only first-party HTTPS chunks pinned to the current release manifest or allowlist.

## Problem Map

| Problem | Start with |
|---|---|
| App feels slow or janky | `rn-perf-measure-js-fps` -> `rn-perf-profile-js-react` |
| Too many re-renders | `rn-perf-profile-js-react` -> `rn-perf-react-compiler` |
| Slow startup | `rn-perf-measure-tti` -> `rn-perf-analyze-js-bundle` |
| Large app size | `rn-perf-analyze-app-bundle` -> `rn-perf-r8-android-shrink` |
| Memory keeps growing | `rn-perf-hunt-js-memory-leaks` or `rn-perf-hunt-native-memory-leaks` |
| Bottom sheet jank | `rn-perf-bottom-sheet` -> `rn-perf-animations-reanimated` |
| List scroll jank | `rn-perf-virtualized-lists` |
| TextInput lag | `rn-perf-uncontrolled-components` |
| Native module is slow | `rn-perf-native-modules-faster` -> `rn-perf-threading-model` |
| Android 16 KB page-size warning | `rn-perf-android-16kb-alignment` |

## Skills

### Orchestrator
- **rn-perf-full-app-test** — end-to-end audit; dispatches to the skills below

### Measure
- **rn-perf-measure-tti** — Time to Interactive markers (cold/warm/prewarm)
- **rn-perf-measure-js-fps** — JS-thread FPS via Perf Monitor / Flashlight
- **rn-perf-profile-js-react** — React Profiler + JS Profiler flamegraph
- **rn-perf-profile-native** — Xcode Instruments + Android Studio Profiler + Perfetto
- **rn-perf-analyze-js-bundle** — source-map-explorer / Expo Atlas / Rsdoctor
- **rn-perf-analyze-app-bundle** — Spotify Ruler / App Thinning / Emerge X-Ray
- **rn-perf-library-size** — bundlephobia / pkg-size / Import Cost

### JavaScript
- **rn-perf-react-compiler** — automatic memoization via babel-plugin-react-compiler
- **rn-perf-concurrent-react** — useDeferredValue / useTransition / Suspense
- **rn-perf-atomic-state-management** — Jotai / Zustand / Recoil to scope re-renders
- **rn-perf-uncontrolled-components** — ref-driven TextInputs / React Hook Form
- **rn-perf-virtualized-lists** — FlatList / FlashList / Legend List
- **rn-perf-animations-reanimated** — worklets + InteractionManager
- **rn-perf-bottom-sheet** — @gorhom/bottom-sheet gestures, scrollables, keyboard
- **rn-perf-hunt-js-memory-leaks** — Hermes heap snapshots, retainers

### Native
- **rn-perf-platform-differences** — iOS vs Android toolchain map
- **rn-perf-threading-model** — Main / JS / Turbo Modules thread model
- **rn-perf-native-memory-mgmt** — ARC, smart pointers, weak refs
- **rn-perf-native-modules-faster** — Turbo / Nitro / Fabric module recipes
- **rn-perf-hunt-native-memory-leaks** — Instruments Leaks + Memory Report
- **rn-perf-view-flattening** — collapsable, RCTViewComponentView
- **rn-perf-android-16kb-alignment** — Google Play 16 KB page-size compatibility

### Bundling & startup
- **rn-perf-tree-shaking** — metro-serializer-esbuild / Re.Pack
- **rn-perf-avoid-barrel-exports** — kill index.ts re-exports
- **rn-perf-rn-sdks-over-web** — swap web libs for RN-native equivalents
- **rn-perf-remote-code-loading** — Re.Pack code splitting / Module Federation
- **rn-perf-disable-bundle-compression** — Hermes mmap via noCompress
- **rn-perf-r8-android-shrink** — R8 minification + resource shrinking
- **rn-perf-native-assets-folder** — per-density image delivery

### Tooling
- **rn-perf-react-native-devtools** — DevTools panels
- **rn-perf-xcode-instruments** — Time Profiler, Leaks, Allocations
- **rn-perf-android-studio-profiler** — Find CPU Hotspots, Track Memory
- **rn-perf-perfetto-traces** — ui.perfetto.dev, system traces
- **rn-perf-flashlight-android** — automated FPS/CPU/RAM scoring in CI
- **rn-perf-simulator-tooling** — MiniSim / Expo Orbit / Tophat

## License

MIT
