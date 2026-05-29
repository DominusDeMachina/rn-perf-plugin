# rn-perf

A Claude Code plugin bundling 34 React Native performance skills, based on Callstack's *Ultimate Guide to React Native Optimization* (2025).

The orchestrator skill `rn-perf-full-app-test` surveys an app end-to-end and dispatches to the specific skill that owns each fix.

## Install

From a local clone:

```bash
/plugin install ~/projects/rn-perf-plugin
```

Or once published to a marketplace, install by name.

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
- **rn-perf-hunt-js-memory-leaks** — Hermes heap snapshots, retainers

### Native
- **rn-perf-platform-differences** — iOS vs Android toolchain map
- **rn-perf-threading-model** — Main / JS / Turbo Modules thread model
- **rn-perf-native-memory-mgmt** — ARC, smart pointers, weak refs
- **rn-perf-native-modules-faster** — Turbo / Nitro / Fabric module recipes
- **rn-perf-hunt-native-memory-leaks** — Instruments Leaks + Memory Report
- **rn-perf-view-flattening** — collapsable, RCTViewComponentView

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
