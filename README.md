# rn-perf

A multi-platform React Native performance plugin bundling 43 shared Agent Skills for Codex, Claude Code, and Gemini CLI, based on Callstack's *Ultimate Guide to React Native Optimization* (2025) plus additional coverage for images, navigation, the data layer, storage, startup work deferral, perceived performance, and production monitoring.

For non-performance best practices (testing, accessibility, security, error handling, OTA updates, deep linking), see the sibling [`rn-quality-plugin`](../rn-quality-plugin).

The orchestrator skill `rn-perf-full-app-test` surveys a React Native app end to end and dispatches to the specific skill that owns each fix.

## Documentation

- [INSTALL.md](./INSTALL.md) - package installation, publishing, and verification.
- [CODEX_README.md](./CODEX_README.md) - Codex plugin setup, invocation, and `AGENTS.md` guidance.
- [CLAUDE_README.md](./CLAUDE_README.md) - Claude Code plugin setup, marketplace use, and command namespace.
- [GEMINI_README.md](./GEMINI_README.md) - Gemini CLI extension setup and generated commands.
- [POWER.md](./POWER.md) - routing rules, guardrails, and release maintenance checks.
- [docs/callstack-react-native-best-practices-comparison.md](./docs/callstack-react-native-best-practices-comparison.md) - comparison with Callstack's public guide.

## Package

The npm package name is `rn-perf-plugin`.

```bash
npm install -g rn-perf-plugin
```

The package ships:

- Codex plugin metadata in `.codex-plugin/plugin.json`
- Claude Code plugin metadata in `.claude-plugin/plugin.json`
- Shared Agent Skills in `skills/`
- Gemini CLI extension output in `gemini-extension/`
- Platform-specific README files for Codex, Claude Code, and Gemini CLI
- A small helper CLI at `rn-perf-plugin`

The helper CLI exposes package paths and local installs:

```bash
rn-perf-plugin path [codex|claude|gemini|claude-marketplace]
rn-perf-plugin install codex [--force]
rn-perf-plugin install gemini [--force]
rn-perf-plugin install all [--force]
```

`install all` currently installs the Codex plugin and Gemini CLI extension. Claude Code uses the package path or marketplace flow documented in [CLAUDE_README.md](./CLAUDE_README.md).

## Starter Prompts

Use the platform's invocation syntax for these shared skill names:

- `rn-perf-full-app-test` to audit a React Native app end to end.
- `rn-perf-analyze-js-bundle` to find JavaScript bundle bloat.
- `rn-perf-measure-tti` to add startup timing.
- `rn-perf-bottom-sheet` to fix bottom sheet jank.
- `rn-perf-android-16kb-alignment` to check Android release compatibility.

## Mandatory Use Via Claude Code Hook

The package ships a Claude Code plugin hook in `hooks/` (referenced from `.claude-plugin/plugin.json`). When the plugin is installed and the working project depends on `react-native` or `expo`, the hook injects the RN Perf mandatory-skill policy into context at session start (including resume and post-compaction) and once more right before the first file edit of the session. Non-React-Native projects are untouched, and the hook never blocks a tool call.

Codex and Gemini CLI have no hook mechanism, so the mandate travels differently there: add the `AGENTS.md` snippet from [CODEX_README.md](./CODEX_README.md) to the target project for Codex, and the generated `gemini-extension/GEMINI.md` context file carries the mandate for Gemini CLI automatically.

## Audit Guardrails

Use the same loop for performance work: measure, optimize, re-measure, validate. Use the same device, release mode, interaction, and metric before and after a fix.

Evidence requirements:

- Record baseline FPS, TTI, bundle size, app size, memory, or profiler evidence before suggesting a fix.
- Treat component count and tree depth as supporting context only.
- Check library versions before API-specific advice, especially FlashList, Reanimated, React Compiler, and Hermes Intl.
- Avoid speculative `useMemo`, `useCallback`, dependency-array, or stale-closure findings without profiler evidence or a reproducible bug.
- When a device automation or evidence-capture tool is available, use it for screenshots, logs, traces, and repeatable scenario evidence.

Security requirements:

- Review shell commands before running them and prefer pinned tooling in docs or CI.
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
| Images load slowly or spike memory | `rn-perf-images` |
| Screen transitions stutter | `rn-perf-navigation-transitions` |
| Spinners everywhere, slow data fetches | `rn-perf-network-data-layer` -> `rn-perf-perceived-performance` |
| Startup blocked by eager SDK init | `rn-perf-measure-tti` -> `rn-perf-startup-deferred-init` |
| Persisted-state reads slow startup | `rn-perf-storage` |
| No visibility into real-user performance | `rn-perf-production-monitoring` |

## Skills

### Orchestrator

- **rn-perf-full-app-test** - end-to-end audit; dispatches to the skills below

### Measure

- **rn-perf-measure-tti** - Time to Interactive markers for cold, warm, and prewarm starts
- **rn-perf-measure-js-fps** - JS-thread FPS via Perf Monitor or Flashlight
- **rn-perf-profile-js-react** - React Profiler and JS Profiler flamegraph
- **rn-perf-profile-native** - Xcode Instruments, Android Studio Profiler, and Perfetto
- **rn-perf-analyze-js-bundle** - source-map-explorer, Expo Atlas, and Rsdoctor
- **rn-perf-analyze-app-bundle** - Spotify Ruler, App Thinning, and Emerge X-Ray
- **rn-perf-library-size** - bundlephobia, pkg-size, and Import Cost
- **rn-perf-production-monitoring** - Sentry/Firebase RUM, Android vitals, and Xcode Organizer

### JavaScript

- **rn-perf-react-compiler** - automatic memoization via `babel-plugin-react-compiler`
- **rn-perf-concurrent-react** - `useDeferredValue`, `useTransition`, and `Suspense`
- **rn-perf-atomic-state-management** - Jotai, Zustand, or Recoil to scope re-renders
- **rn-perf-uncontrolled-components** - ref-driven TextInputs and React Hook Form
- **rn-perf-virtualized-lists** - FlatList, FlashList, and Legend List
- **rn-perf-animations-reanimated** - worklets and `InteractionManager`
- **rn-perf-bottom-sheet** - `@gorhom/bottom-sheet` gestures, scrollables, and keyboard
- **rn-perf-hunt-js-memory-leaks** - Hermes heap snapshots and retainers
- **rn-perf-navigation-transitions** - native-stack, `freezeOnBlur`, and post-transition work
- **rn-perf-perceived-performance** - skeletons, optimistic UI, and latency masking

### Data And Media

- **rn-perf-images** - expo-image caching, recycling, and bitmap memory
- **rn-perf-network-data-layer** - request waterfalls, TanStack Query, and payload cost
- **rn-perf-storage** - MMKV, SQLite, and startup-path persistence

### Native

- **rn-perf-platform-differences** - iOS vs Android toolchain map
- **rn-perf-threading-model** - Main, JS, and Turbo Modules thread model
- **rn-perf-native-memory-mgmt** - ARC, smart pointers, and weak refs
- **rn-perf-native-modules-faster** - Turbo, Nitro, and Fabric module recipes
- **rn-perf-hunt-native-memory-leaks** - Instruments Leaks and Memory Report
- **rn-perf-view-flattening** - `collapsable` and `RCTViewComponentView`
- **rn-perf-android-16kb-alignment** - Google Play 16 KB page-size compatibility

### Bundling And Startup

- **rn-perf-tree-shaking** - `metro-serializer-esbuild` and Re.Pack
- **rn-perf-avoid-barrel-exports** - remove `index.ts` re-exports
- **rn-perf-rn-sdks-over-web** - swap web libraries for React Native equivalents
- **rn-perf-remote-code-loading** - Re.Pack code splitting and Module Federation
- **rn-perf-disable-bundle-compression** - Hermes mmap via `noCompress`
- **rn-perf-r8-android-shrink** - R8 minification and resource shrinking
- **rn-perf-native-assets-folder** - per-density image delivery
- **rn-perf-startup-deferred-init** - deferring SDK init and module work out of the startup path

### Tooling

- **rn-perf-react-native-devtools** - React Native DevTools panels
- **rn-perf-xcode-instruments** - Time Profiler, Leaks, and Allocations
- **rn-perf-android-studio-profiler** - Find CPU Hotspots and Track Memory
- **rn-perf-perfetto-traces** - `ui.perfetto.dev` and system traces
- **rn-perf-flashlight-android** - automated FPS, CPU, and RAM scoring in CI
- **rn-perf-simulator-tooling** - MiniSim, Expo Orbit, and Tophat

## License

MIT
