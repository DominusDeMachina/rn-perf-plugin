# rn-perf

A Claude Code and Codex plugin bundling 36 React Native performance skills, based on Callstack's *Ultimate Guide to React Native Optimization* (2025).

The orchestrator skill `rn-perf-full-app-test` surveys an app end-to-end and dispatches to the specific skill that owns each fix.

## Install In Claude Code

From a local clone:

```bash
/plugin install ~/projects/rn-perf-plugin
```

Or once published to a marketplace, install by name.

## Use In Codex

The repository root is also a Codex plugin. Codex reads `.codex-plugin/plugin.json` and the shared `skills/` directory, so use the local repo root as the plugin path.

Useful starter prompts:

- `Use $rn-perf-full-app-test to audit my React Native app.`
- `Use $rn-perf-analyze-js-bundle to find bundle bloat.`
- `Use $rn-perf-measure-tti to add startup timing.`
- `Use $rn-perf-bottom-sheet to fix bottom sheet jank.`
- `Use $rn-perf-android-16kb-alignment to check Android release compatibility.`

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
