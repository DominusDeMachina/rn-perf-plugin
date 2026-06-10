# RN Perf vs Callstack React Native Best Practices

Date: 2026-05-29

Local source: this repository, `/Users/gennadiyfurduy/Projects/rn-perf-plugin`

Implementation status: proposed gap-closing changes have been applied in this repo. RN Perf now has 36 skills, including `rn-perf-bottom-sheet` and `rn-perf-android-16kb-alignment`, plus refreshed shared guardrails and version-specific guidance.

Addendum (2026-06-10): upstream is unchanged since the sync above (last commit `a5c8f21`). RN Perf added 7 skills beyond upstream's scope — `rn-perf-images`, `rn-perf-navigation-transitions`, `rn-perf-network-data-layer`, `rn-perf-production-monitoring`, `rn-perf-startup-deferred-init`, `rn-perf-storage`, and `rn-perf-perceived-performance` — bringing the total to 43. Non-performance best practices (testing, accessibility, security, error handling, OTA updates, deep linking) live in the sibling `rn-quality-plugin` rather than this plugin.

Upstream source: [callstackincubator/agent-skills `skills/react-native-best-practices`](https://github.com/callstackincubator/agent-skills/tree/main/skills/react-native-best-practices), fetched at commit `a5c8f21` (`2026-05-25`, `docs: add agent-device verification guidance (#63)`).

## Executive Summary

The two projects are based on the same Callstack React Native Optimization material, but they package it differently.

- Upstream is a single umbrella skill, `react-native-best-practices`, with `POWER.md`, `SKILL.md`, 29 topic reference files, and 12 reference images.
- RN Perf is a plugin of 36 standalone `rn-perf-*` skills, including one orchestrator skill and several tool-driver skills.
- RN Perf now covers all 29 upstream reference topics as first-class skills.
- The two previously missing upstream topics, bottom sheet optimization and Android 16 KB page-size alignment, are now first-class RN Perf skills.
- RN Perf is stronger on operational tooling than upstream: DevTools, Xcode Instruments, Android Studio Profiler, Perfetto, Flashlight, simulator tooling, and the full-app audit orchestrator.
- Upstream has stronger shared guardrails: security notes, review guardrails, priority ordering, version checks, measure/optimize/re-measure workflow, and visual evidence notes.
- RN Perf skills have been refreshed against upstream's newer guidance for FlashList v2, Reanimated 4 / `react-native-worklets`, and method-level Hermes Intl support.

Recommendation implemented: keep RN Perf's multi-skill architecture, add the two absent topic skills, and import upstream's global guardrails and newer version gates into the relevant RN Perf skills and orchestrator.

## Approach Differences

| Area | Upstream approach | RN Perf approach | Consequence |
|---|---|---|---|
| Packaging | One umbrella skill with references loaded as needed. | Many single-responsibility skills with natural-language triggers. | RN Perf gives better targeted invocation; upstream gives better centralized navigation. |
| Routing | `POWER.md` maps problems to reference files and gives onboarding. | `rn-perf-full-app-test` orchestrates broad audits; individual skills self-route through descriptions and related skills; root `POWER.md` and README now carry shared routing. | RN Perf keeps targeted invocation while adding centralized guidance. |
| Scope | 29 reference topics across JS, native, and bundling. | 36 skills: 29 matching topics, 6 extra operational skills, and 1 orchestrator. | RN Perf has broader tooling coverage and now covers every upstream topic. |
| Skill format | Hybrid reference format: quick pattern/command/config/reference plus deeper steps and pitfalls. | Consistent standalone format: when to use, single responsibility, workflow, code patterns, verification, gotchas, references, related skills. | RN Perf is more agent-actionable per topic; upstream is easier to skim as a single corpus. |
| Priority model | Explicit priority table: FPS/re-renders, bundle size, TTI, native performance, memory, animations. | Priority exists mostly inside `rn-perf-full-app-test`. | Add priority and review guardrails to the orchestrator and README, and repeat the critical ones in high-risk skills. |
| Verification | Repeated notes about visual reports, screenshots, traces, and `agent-device` where relevant. | Verification is mostly command/tool focused; separate driver skills cover tools deeply; README and orchestrator now require before/after evidence. | RN Perf keeps tool depth while adding explicit evidence policy. |
| Safety | Central security notes for shell commands, package provenance, and remote code chunks. | Safety guidance appears in some topic gotchas but is not centralized. | Add shared security guardrails and duplicate remote-code guardrails in `rn-perf-remote-code-loading`. |
| Visual assets | Includes 12 images for treemaps, profiler views, traces, memory snapshots, and diagrams. | No local reference images. | RN Perf can remain text-first, but screenshots would improve profiler-heavy skills. |

## Coverage Mapping

### JavaScript / React

| Upstream reference | RN Perf equivalent | Status | Notes |
|---|---|---|---|
| `js-lists-flatlist-flashlist.md` | `rn-perf-virtualized-lists` | Covered | Refreshed with FlashList v1 vs v2 guidance so `estimatedItemSize` is only recommended for v1. |
| `js-profile-react.md` | `rn-perf-profile-js-react`, `rn-perf-react-native-devtools` | Covered | RN Perf has a separate DevTools driver skill, which is better for tool navigation. |
| `js-measure-fps.md` | `rn-perf-measure-js-fps`, `rn-perf-flashlight-android` | Covered | RN Perf has deeper Flashlight automation coverage. |
| `js-memory-leaks.md` | `rn-perf-hunt-js-memory-leaks` | Covered | Similar scope. Upstream adds more visual/evidence reminders. |
| `js-atomic-state.md` | `rn-perf-atomic-state-management` | Covered | RN Perf has good trigger specificity and React Compiler caveats. |
| `js-concurrent-react.md` | `rn-perf-concurrent-react` | Covered | Similar scope. |
| `js-react-compiler.md` | `rn-perf-react-compiler` | Covered | Similar scope. |
| `js-animations-reanimated.md` | `rn-perf-animations-reanimated` | Covered | Refreshed with Reanimated v3 vs v4, `react-native-worklets`, `scheduleOnUI`, `scheduleOnRN`, and New Architecture gating. |
| `js-bottomsheet.md` | `rn-perf-bottom-sheet` | Covered | Added as a first-class bottom sheet skill. |
| `js-uncontrolled-components.md` | `rn-perf-uncontrolled-components` | Covered | Similar scope. |

### Native

| Upstream reference | RN Perf equivalent | Status | Notes |
|---|---|---|---|
| `native-turbo-modules.md` | `rn-perf-native-modules-faster` | Covered | RN Perf is more detailed on Builder Bob, Nitro/Fabric choices, language-boundary costs, and coroutine cleanup. |
| `native-sdks-over-polyfills.md` | `rn-perf-rn-sdks-over-web` | Covered | Refreshed with method-level Hermes Intl checks and the `Intl.NumberFormat.prototype.formatToParts()` Hermes/iOS caveat. |
| `native-measure-tti.md` | `rn-perf-measure-tti` | Covered | RN Perf has strong marker and cold-start guidance. |
| `native-threading-model.md` | `rn-perf-threading-model` | Covered | Similar scope. |
| `native-profiling.md` | `rn-perf-profile-native`, `rn-perf-xcode-instruments`, `rn-perf-android-studio-profiler`, `rn-perf-perfetto-traces` | Covered, stronger locally | RN Perf splits profiling concepts from driver manuals. |
| `native-platform-setup.md` | `rn-perf-platform-differences`, `rn-perf-simulator-tooling` | Covered, stronger locally | RN Perf has extra simulator/emulator workflow coverage. |
| `native-view-flattening.md` | `rn-perf-view-flattening` | Covered | Similar scope. |
| `native-memory-patterns.md` | `rn-perf-native-memory-mgmt` | Covered | Similar scope. |
| `native-memory-leaks.md` | `rn-perf-hunt-native-memory-leaks` | Covered | RN Perf has strong practical workflows; upstream adds device-evidence reminders. |
| `native-android-16kb-alignment.md` | `rn-perf-android-16kb-alignment` | Covered | Added as a first-class Android 16 KB page-size alignment skill. |

### Bundle / App Size

| Upstream reference | RN Perf equivalent | Status | Notes |
|---|---|---|---|
| `bundle-barrel-exports.md` | `rn-perf-avoid-barrel-exports` | Covered | Similar scope. |
| `bundle-analyze-js.md` | `rn-perf-analyze-js-bundle` | Covered | RN Perf adds Rsdoctor and clearer Metro source-map caveats. |
| `bundle-tree-shaking.md` | `rn-perf-tree-shaking` | Covered | Similar scope. |
| `bundle-analyze-app.md` | `rn-perf-analyze-app-bundle` | Covered | RN Perf includes Emerge caution and CI threshold guidance. |
| `bundle-r8-android.md` | `rn-perf-r8-android-shrink` | Covered | Similar scope. |
| `bundle-hermes-mmap.md` | `rn-perf-disable-bundle-compression` | Covered | RN Perf already has the RN >= 0.79 default gate. |
| `bundle-native-assets.md` | `rn-perf-native-assets-folder` | Covered | Similar scope. |
| `bundle-library-size.md` | `rn-perf-library-size` | Covered | RN Perf correctly warns that native binary cost is invisible to web bundle tools. |
| `bundle-code-splitting.md` | `rn-perf-remote-code-loading` | Covered | RN Perf has good warnings against code splitting in small/medium Hermes apps. |

### RN Perf-only Skills

These are absent upstream and are useful differentiators:

- `rn-perf-full-app-test`: broad audit orchestrator.
- `rn-perf-react-native-devtools`: React Native DevTools driver manual.
- `rn-perf-xcode-instruments`: Xcode Instruments driver manual.
- `rn-perf-android-studio-profiler`: Android Studio Profiler and Layout Inspector driver manual.
- `rn-perf-perfetto-traces`: Perfetto trace capture and reading.
- `rn-perf-flashlight-android`: automated Android FPS/CPU/RAM scoring.
- `rn-perf-simulator-tooling`: simulator/emulator workflow setup.

## Implemented Gap Closures

### 1. Bottom Sheet Performance

Upstream has `js-bottomsheet.md`; RN Perf now has `rn-perf-bottom-sheet`.

Why this matters:

- `@gorhom/bottom-sheet` is common in production RN apps.
- It creates cross-cutting performance problems: gesture-driven state, scrollable coordination, context provider re-renders, keyboard handling, modal setup, and JS callbacks during animation.
- Existing RN Perf skills can solve pieces, but no skill routes "bottom sheet jank" to the right sequence.

Implemented skill:

- Path: `skills/rn-perf-bottom-sheet/SKILL.md`
- Agent manifest: `skills/rn-perf-bottom-sheet/agents/openai.yaml`
- Trigger terms: `@gorhom/bottom-sheet`, `BottomSheet`, `BottomSheetModal`, `BottomSheetScrollView`, `animatedIndex`, `animatedPosition`, bottom sheet gesture jank, sheet keyboard lag, `BottomSheetTextInput`, `react-native-true-sheet`.
- Main guidance:
  - Keep gesture and scroll-driven state on UI-thread shared values.
  - Avoid React `setState` inside high-frequency sheet animation callbacks unless there is measured evidence it is cheap.
  - Use library-provided `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetSectionList`, and compatible FlashList integration instead of raw RN scrollables.
  - Use `BottomSheetModalProvider` correctly.
  - Prefer `BottomSheetTextInput` or port the library's focus/blur handlers for custom inputs.
  - Evaluate `@lodev09/react-native-true-sheet` only when New Architecture/Fabric and native behavior fit the product.
- Related skills:
  - `rn-perf-animations-reanimated`
  - `rn-perf-virtualized-lists`
  - `rn-perf-uncontrolled-components`
  - `rn-perf-atomic-state-management`
  - `rn-perf-view-flattening`
  - `rn-perf-measure-js-fps`

### 2. Android 16 KB Page-size Alignment

Upstream has `native-android-16kb-alignment.md`; RN Perf now has `rn-perf-android-16kb-alignment`.

Why this matters:

- Android 15 introduced 16 KB page-size devices.
- Google Play's requirement affects new apps and updates targeting Android 15+ from November 1, 2025.
- React Native apps frequently include transitive `.so` libraries through native modules, SDKs, PDF/image/video libraries, ML libraries, maps, payments, analytics, or crypto.
- This is not only a performance topic; it can block publishing.

Implemented skill:

- Path: `skills/rn-perf-android-16kb-alignment/SKILL.md`
- Agent manifest: `skills/rn-perf-android-16kb-alignment/agents/openai.yaml`
- Trigger terms: Android 16 KB page size, 16KB, page-size alignment, `zipalign -P 16`, Android 15, API 35, Play Console 16 KB warning, unaligned `.so`, native library alignment.
- Main guidance:
  - Build a release APK/AAB variant.
  - Verify native library alignment with Android build tools, especially `zipalign -c -P 16 -v 4 app-release.apk`.
  - Trace misaligned `.so` files back to npm packages or Gradle dependencies.
  - Update, replace, or remove incompatible native dependencies.
  - Test on a 16 KB Android emulator image or supported Pixel 8/8a/9 device booted with 16 KB page size.
  - Add CI verification for release artifacts.
- Related skills:
  - `rn-perf-platform-differences`
  - `rn-perf-analyze-app-bundle`
  - `rn-perf-r8-android-shrink`
  - `rn-perf-native-modules-faster`
  - `rn-perf-android-studio-profiler`

## Correctness and Freshness Updates

### FlashList v2

Previous RN Perf issue:

- `rn-perf-virtualized-lists` says to migrate complex `FlatList` cases to FlashList with `estimatedItemSize`.
- It also says not to ship FlashList without `estimatedItemSize`.

Upstream's newer guidance:

- FlashList v1 uses `estimatedItemSize`.
- FlashList v2 deprecates `estimatedItemSize`, `estimatedListSize`, and `estimatedFirstItemOffset`.
- The skill needed to check the installed FlashList major version before making prop-specific recommendations.

Implemented change:

- Add a version guard before recommending FlashList props.
- For FlashList v1: keep `estimatedItemSize`.
- For FlashList v2+: focus on stable keys, lightweight row components, `getItemType` for heterogeneous rows, and avoiding render-path side effects.
- Updated `rn-perf-full-app-test` and `rn-perf-virtualized-lists` so `estimatedItemSize` is only recommended for FlashList v1.

### Reanimated 4 and `react-native-worklets`

Previous RN Perf issue:

- `rn-perf-animations-reanimated` is written around `runOnUI`, `runOnJS`, and the `react-native-reanimated/plugin` setup.

Upstream's newer guidance:

- Reanimated 4 uses `react-native-worklets`.
- The Babel plugin changes to `react-native-worklets/plugin`.
- `scheduleOnUI` and `scheduleOnRN` are the newer worklets APIs.
- Reanimated 4 requires the New Architecture.

Implemented change:

- Make the skill version-aware:
  - Reanimated v3: keep existing `runOnUI`, `runOnJS`, and `react-native-reanimated/plugin` guidance.
  - Reanimated v4: use `react-native-worklets`, `scheduleOnUI`, `scheduleOnRN`, and New Architecture gating.
- Add a compatibility note for bottom sheets: `@gorhom/bottom-sheet` v5 is built for Reanimated v3; Reanimated v4 needs explicit validation against the project's bottom-sheet version.

### Hermes Intl Support

Previous RN Perf issue:

- `rn-perf-rn-sdks-over-web` previously had a Hermes Intl support table dated January 2025.

Upstream's newer guidance:

- The table is newer and more nuanced.
- It calls out partial `Intl.NumberFormat` coverage, including the `formatToParts()` gap on Hermes/iOS.

Implemented change:

- Refresh the table and make the workflow method-based rather than API-name-only.
- Before deleting any `@formatjs/*` polyfill, grep for the exact constructor and method usage.
- Keep `@formatjs/intl-numberformat` when the app uses `formatToParts()` on Hermes/iOS.

### Global Review Guardrails

Upstream repeats several useful review constraints that RN Perf now imports:

- Measure first, optimize, re-measure, and validate the same interaction or artifact.
- Check library versions before suggesting API-specific fixes.
- Do not suggest `useMemo` or `useCallback` dependency changes unless profiling or a reproducible correctness issue supports the change.
- Do not report stale closures speculatively; show the stale read path, a repro, or profiler evidence.
- Treat component tree depth/count as supporting context, not primary performance evidence.

Implemented change:

- Add these guardrails to `rn-perf-full-app-test`.
- Add short versions to `rn-perf-profile-js-react`, `rn-perf-react-compiler`, `rn-perf-virtualized-lists`, and `rn-perf-atomic-state-management`.
- Add a "review evidence required" section to the README so broad audits stay evidence-led.

### Security and Supply-chain Guardrails

Upstream has centralized safety notes; RN Perf distributes some of this across individual gotchas.

Implemented change:

- Add a shared security section to README and `rn-perf-full-app-test`.
- Repeat the highest-risk notes in the relevant skills:
  - Review shell commands and prefer version-pinned tooling.
  - Do not pipe remote install scripts directly to a shell.
  - Treat third-party packages as normal supply-chain dependencies that need provenance and version review.
  - In `rn-perf-remote-code-loading`, load only first-party chunks over HTTPS from a release-pinned manifest or allowlist; fail closed on unexpected chunk IDs or origins.

## Implemented Plugin Changes

### Phase 1: Close Critical Content Holes

1. Added `rn-perf-bottom-sheet`.
2. Added `rn-perf-android-16kb-alignment`.
3. Added `agents/openai.yaml` for both.
4. Updated README skill list and plugin descriptions from 34 to 36 skills.
5. Updated `rn-perf-full-app-test`:
   - Added bottom sheet checks to the JavaScript audit phase.
   - Added Android 16 KB alignment checks to the native/app-size phase.
   - Added both to related-skill lists and the priority punch-list guidance.

### Phase 2: Refresh Existing Skills

1. Updated `rn-perf-virtualized-lists` for FlashList v1 vs v2 behavior.
2. Updated `rn-perf-animations-reanimated` for Reanimated v3 vs v4 and `react-native-worklets`.
3. Updated `rn-perf-rn-sdks-over-web` for method-level Hermes Intl support.
4. Updated `rn-perf-profile-js-react`, `rn-perf-react-compiler`, and `rn-perf-atomic-state-management` with anti-speculation guardrails.
5. Updated `rn-perf-remote-code-loading` with the first-party chunk security model.

### Phase 3: Add Shared Routing and Evidence Policy

1. Added shared router/guardrail content in `POWER.md`, README, and `rn-perf-full-app-test`.
2. Added a problem-to-skill mapping table similar to upstream:
   - App feels slow/janky -> `rn-perf-measure-js-fps` -> `rn-perf-profile-js-react`
   - Too many re-renders -> `rn-perf-profile-js-react` -> `rn-perf-react-compiler`
   - Slow startup -> `rn-perf-measure-tti` -> `rn-perf-analyze-js-bundle`
   - Large app size -> `rn-perf-analyze-app-bundle` -> `rn-perf-r8-android-shrink`
   - Memory growing -> `rn-perf-hunt-js-memory-leaks` or `rn-perf-hunt-native-memory-leaks`
   - Bottom sheet jank -> `rn-perf-bottom-sheet` -> `rn-perf-animations-reanimated`
   - Native library alignment issue -> `rn-perf-android-16kb-alignment`
3. Added an evidence checklist:
   - Baseline metric
   - Target interaction or artifact
   - Fix applied
   - Same measurement repeated
   - Before/after numbers or screenshots/traces

### Phase 4: Improve Maintenance

1. Track upstream commit/date in this comparison document or a `docs/upstream-sync.md`.
2. Keep a recurring review checklist for fast-moving topics:
   - FlashList major versions
   - Reanimated / Worklets API changes
   - Hermes Intl support
   - Android Play publishing requirements
   - React Compiler compatibility with current RN/React releases
3. Reviewed selected upstream images/screenshots. They were not copied in this pass because RN Perf remains text-first and has separate tool-driver skills for profiler navigation; revisit only if a skill needs visual recognition to be reliable.

## What Not to Change

Do not collapse RN Perf into one umbrella skill. The local plugin's per-topic skills are a strength for Codex-style discovery and targeted invocation. The original gap was not architecture; it was missing topics, stale version gates, and missing shared guardrails.

Do not blindly copy upstream reference files verbatim. Import the substance, but keep RN Perf's existing single-responsibility format and deeper tool-driver separation.

## Sources

- Upstream skill: [callstackincubator/agent-skills `react-native-best-practices`](https://github.com/callstackincubator/agent-skills/tree/main/skills/react-native-best-practices)
- Upstream raw `SKILL.md`: [raw GitHub](https://raw.githubusercontent.com/callstackincubator/agent-skills/main/skills/react-native-best-practices/SKILL.md)
- Upstream raw `POWER.md`: [raw GitHub](https://raw.githubusercontent.com/callstackincubator/agent-skills/main/skills/react-native-best-practices/POWER.md)
- Android 16 KB page-size official docs: [Android Developers - Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
