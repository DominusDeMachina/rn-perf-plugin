---
name: rn-perf-tree-shaking
description: Use when the user wants real dead-code elimination in a React Native app — Metro doesn't tree-shake by default, so this skill walks through `metro-serializer-esbuild` from rnx-kit, Expo SDK 52's `experimentalImportSupport` + `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH/TREE_SHAKING`, and migration to Re.Pack (Webpack/Rspack) for production-grade tree shaking. Trigger whenever the user mentions tree shaking, dead code elimination, `metro-serializer-esbuild`, rnx-kit, `experimentalImportSupport`, EXPO_UNSTABLE_TREE_SHAKING, Re.Pack, Rspack, platform-shaking, `sideEffects` package.json field, or wants to reduce JS bundle size beyond what barrel removal achieved — even without an explicit ask to enable tree shaking.
---

# Enable Tree Shaking in React Native

## When to use
The user has exhausted barrel removal and wants further JS bundle reduction, or specifically asks about Re.Pack, rnx-kit's ESBuild serializer, or Expo's experimental tree shaking flags. Callstack benchmarked **10–15% reduction** on Expensify when migrating Metro → Re.Pack (production minified + HBC).

## What this skill does (single responsibility)
Enables real (or near-real) tree shaking in a RN project to eliminate unused exports. Strictly the bundler-side fix. It does **not** cover barrel removal (see [[rn-perf-avoid-barrel-exports]], usually a cheaper alternative for app code) or remote code loading (see [[rn-perf-remote-code-loading]]).

## Workflow
1. Confirm the bundler:
   - Plain RN with Metro → **option A** (`metro-serializer-esbuild`, "fake but works").
   - Expo project → **option B** (experimental flags).
   - Need production-grade results → **option C** (Re.Pack).
2. Baseline: bundle in **production-minified + Hermes-bytecode** mode and capture size with [[rn-perf-analyze-js-bundle]].
3. Apply the chosen option:
   - **A**: install `@rnx-kit/metro-serializer-esbuild` and wire it into `metro.config.js`. ESBuild takes over serialisation.
   - **B**: enable `experimentalImportSupport: true` in `metro.config.js` and set `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1` and `EXPO_UNSTABLE_TREE_SHAKING=1` in `.env`. Production-only.
   - **C**: migrate to Re.Pack with `npx @callstack/repack-init`.
4. Re-bundle and re-analyse. Target **10–15% reduction** with Re.Pack (minified + HBC); smaller and noisier with Expo/rnx-kit.
5. Smoke-test: tree shaking can over-eagerly remove code with implicit side effects (polyfills patching `global`). If something breaks, mark the offender in its `package.json` with `"sideEffects": [...]`.

## Code patterns

Expo SDK 52 — `metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
  },
});

module.exports = config;
```

Expo SDK 52 — `.env` (production-only experimental optimisations):

```
EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1
EXPO_UNSTABLE_TREE_SHAKING=1
```

Migrate to Re.Pack:

```
npx @callstack/repack-init
```

Platform-shaking enabler — direct import from `react-native`:

```ts
// works with platform-shaking
import { Platform } from 'react-native';

if (Platform.OS === 'ios') { /* iOS-only code, stripped on Android */ }
```

Marking a package side-effect-free (its `package.json`):

```json
{
  "sideEffects": false
}
```

Selectively keep side-effects:

```json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}
```

Benchmark from the book (Expensify, p. 162):

| Bundle Type | Metro (MB) | Re.Pack (MB) | Diff |
|---|---|---|---|
| Development | 38.49 | 49.04 | +27.41% |
| Production | 35.63 | 38.48 | +8.00% |
| Production Minified | 15.54 | 13.36 | **-14.03%** |
| Production (HBC) | 21.79 | 19.35 | **-11.20%** |
| Production Minified (HBC) | 21.62 | 19.05 | **-11.89%** |

Re.Pack's un-minified production is **larger** because Rspack only marks unused code; minification removes it. Hermes bytecode includes minification, hence the negative numbers.

## Verification
- Re-bundle in **production-minified + HBC** mode and measure with [[rn-perf-analyze-js-bundle]].
- Target 10–15% reduction with Re.Pack on a large app. Expo's experimental flags are noisier — the book couldn't reproduce stable gains.
- Diff `stats.json` before/after: previously included unused exports should be gone.
- Smoke test: launch the app, navigate every screen, exercise auth/payment flows that often rely on polyfills with side effects.

## Edge cases & gotchas
- **Side-effects matter.** Libraries that mutate globals at import time (older polyfills, some i18n libs) must be marked with `"sideEffects"` so tree shaking spares them. Symptom: `undefined is not a function` for globals like `Intl`, `URL`, `crypto`.
- **Expo's tree shaking is experimental** as of SDK 52. The book outright excluded it from the published benchmark because they couldn't reproduce stable gains.
- `metro-serializer-esbuild` produces a bundle Metro didn't make — module IDs and inline requires can change in ways that break libraries assuming Metro's serializer.
- **Re.Pack's production (non-minified) bundle is +8% larger** than Metro's. The win only appears after minification (Terser) and HBC conversion. Don't compare un-minified sizes.
- **CommonJS vs ESM**: tree shaking is dramatically better against ESM. RN's default Babel preset transforms ESM → CJS; Expo's `experimentalImportSupport` uses Metro's `@babel/plugin-transform-modules-commonjs` variant to preserve ESM-style behaviour.
- **Platform-shaking** only works when `Platform` is imported **directly from `react-native`**. Indirect re-exports defeat it.
- **inlineRequires** is off by default in Expo — combining it with tree shaking can compound gains but requires care.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Experiment With Tree Shaking", pp. 159–162.
- Re.Pack: https://re-pack.dev
- `@rnx-kit/metro-serializer-esbuild`: https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild
- Expo tree shaking docs: https://docs.expo.dev/guides/tree-shaking/

## Related skills
- [[rn-perf-avoid-barrel-exports]] — often a faster, simpler win for app code.
- [[rn-perf-analyze-js-bundle]] — measure the delta.
- [[rn-perf-remote-code-loading]] — next step once tree shaking is exhausted.
- [[rn-perf-library-size]] — pre-flight check; tree shaking lowers the *effective* cost.
