# RN Perf Routing and Guardrails

Use `rn-perf-full-app-test` for broad audits. Use a specific `rn-perf-*` skill when the user names a concrete symptom, tool, API, package, or platform concern.

## Core Workflow

Follow this loop for every performance change:

1. Measure the target interaction or artifact.
2. Apply the smallest targeted fix.
3. Re-measure the same interaction or artifact.
4. Validate the result and keep the before/after evidence.

Do not treat component count, tree depth, package count, or code shape as primary evidence. They are signals that need FPS, TTI, bundle/app size, memory, profiler, trace, or release-artifact proof.

## Problem Map

| Problem | Start with |
|---|---|
| App feels slow or janky | `rn-perf-measure-js-fps` -> `rn-perf-profile-js-react` |
| Too many re-renders | `rn-perf-profile-js-react` -> `rn-perf-react-compiler` |
| Slow startup | `rn-perf-measure-tti` -> `rn-perf-analyze-js-bundle` |
| Large app size | `rn-perf-analyze-app-bundle` -> `rn-perf-r8-android-shrink` |
| Memory keeps growing | `rn-perf-hunt-js-memory-leaks` or `rn-perf-hunt-native-memory-leaks` |
| Animation drops frames | `rn-perf-animations-reanimated` |
| Bottom sheet jank | `rn-perf-bottom-sheet` -> `rn-perf-animations-reanimated` |
| List scroll jank | `rn-perf-virtualized-lists` |
| TextInput lag | `rn-perf-uncontrolled-components` |
| Native module is slow | `rn-perf-native-modules-faster` -> `rn-perf-threading-model` |
| Android 16 KB page-size warning | `rn-perf-android-16kb-alignment` |

## Review Guardrails

- Check library versions before API-specific advice. FlashList v2, Reanimated v4, React Compiler, Hermes Intl, and React Native's Android bundle-compression defaults all have version-specific behavior.
- Do not recommend `useMemo`, `useCallback`, dependency-array, or stale-closure fixes unless profiler evidence or a reproducible bug supports the finding.
- For visual/tool output, keep evidence: screenshots, traces, exported profiles, or exact metric values.
- When a device automation or evidence-capture tool is available, use it for repeatable screenshots, logs, traces, and scenario evidence.
- Review shell commands before running them, prefer pinned tooling in docs/CI, and do not pipe remote install scripts directly into a shell.
- Treat new packages, native SDKs, Re.Pack plugins, and remote chunks as supply-chain changes.
- For remote code loading, resolve production chunks only through first-party HTTPS release manifests or allowlists and fail closed on unknown IDs.

## Maintenance Checklist

Re-check these before publishing a new plugin version or syncing from upstream:

- Upstream `callstackincubator/agent-skills` commit and `react-native-best-practices` reference list.
- FlashList major-version behavior and deprecated props.
- Reanimated / `react-native-worklets` migration and architecture requirements.
- Hermes Intl constructor and method support across iOS and Android.
- Android Play requirements, especially target SDK and 16 KB page-size policy.
- React Compiler package, lint, `target`, and React Native compatibility.
- Re.Pack remote chunk resolver security guidance.
