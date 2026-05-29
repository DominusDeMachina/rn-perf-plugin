---
name: rn-perf-rn-sdks-over-web
description: Use when the user is shipping a React Native app that drags in web-targeted JS libraries — Intl polyfills (`@formatjs/*`), `crypto-js`, JS Stack/Tab navigators, JS-rendered pickers — and you want to swap them for dedicated RN-native equivalents (Hermes built-in Intl, `react-native-quick-crypto`, Native Stack via `react-native-screens`, native bottom tabs, Zeego, RN Date Picker). Trigger whenever the user mentions @formatjs, crypto-js, createStackNavigator, createBottomTabNavigator, JS bundle bloat, Intl polyfill, react-native-quick-crypto, native stack, native tabs, or "use a web library in RN".
---

# Prefer Dedicated RN SDKs Over Web Libraries

## When to use
The app pulls `@formatjs/intl-*` polyfills, `crypto-js`, JS-rendered stack/tab navigators, or JS-rendered pickers — and you want the bundle smaller, the JS thread freer, and the UX more native.

## What this skill does (single responsibility)
Audits a React Native dependency tree for web-targeted libraries and swaps them for dedicated RN equivalents in four categories: Intl polyfills, crypto, navigation, and JS-rendered UI primitives. Does **not** cover general bundle analysis (see [[rn-perf-analyze-js-bundle]]), per-library size measurement (see [[rn-perf-library-size]]), or tree shaking (see [[rn-perf-tree-shaking]]).

## Hermes Intl support (as of January 2025)

| Intl API | Hermes support |
|---|---|
| `Intl.Collator` | yes |
| `Intl.DateTimeFormat` | yes |
| `Intl.NumberFormat` | yes |
| `Intl.getCanonicalLocales()` | yes |
| `Intl.supportedValuesOf()` | yes |
| `Intl.ListFormat` | no |
| `Intl.DisplayNames` | no |
| `Intl.Locale` | no |
| `Intl.RelativeTimeFormat` | no |
| `Intl.Segmenter` | no |
| `Intl.PluralRules` | no |

Re-check this table on each Hermes upgrade — expect more "yes" entries over time. **Removing supported polyfills alone shaves ≥430 kB from the JS bundle** (book example), and because they're loaded eagerly at app entry, this directly improves TTI.

## Workflow
1. **Audit** dependencies with `npm ls` / `yarn list` (and [[rn-perf-analyze-js-bundle]] for byte impact).
2. **Intl polyfills** — cross-reference `@formatjs/intl-*` imports against the table above. Delete each that maps to a Hermes-supported API. Also audit locale-data files (`@formatjs/intl-X/locale-data/Y`) — they're often the biggest contributors.
3. **Crypto** — `grep -R "crypto-js"`. Replace with `react-native-quick-crypto` (C++ via JSI, up to **58× faster** than `crypto-js`). Essential for CSPRNG (e.g., Web3 wallet seed) — `Math.random()` cannot provide cryptographic randomness; you need OS entropy via native APIs.
4. **Navigation** — find `createStackNavigator` usages and migrate to `@react-navigation/native-stack` (backed by `react-native-screens`, uses iOS `UINavigationController` / Android `Fragment`, runs on UI thread). Same for `createBottomTabNavigator` → `@bottom-tabs/react-navigation`.
5. **UI primitives** — replace JS-rendered date pickers, dropdowns, action sheets, menus, sliders with native-backed equivalents (Zeego, RN Date Picker, RN Slider).
6. **Measure**: bundle size delta, TTI delta (`runJSBundleStart → runJSBundleEnd`), and navigation FPS.

## Code patterns

Remove supported Intl polyfills (after January 2025):

```diff
-import '@formatjs/intl-getcanonicallocales/polyfill';
 import '@formatjs/intl-locale/polyfill';
-import '@formatjs/intl-numberformat/polyfill';
-import '@formatjs/intl-numberformat/locale-data/en';
-import '@formatjs/intl-datetimeformat/polyfill';
-import '@formatjs/intl-datetimeformat/locale-data/en';
 import '@formatjs/intl-pluralrules/polyfill';
 import '@formatjs/intl-pluralrules/locale-data/en';
 import '@formatjs/intl-relativetimeformat/polyfill';
 import '@formatjs/intl-relativetimeformat/locale-data/en';
 import '@formatjs/intl-displaynames/polyfill';
```

Use the now-built-in Intl directly:

```ts
const number = 123456.789;
const germanFormat = new Intl.NumberFormat('de-DE');
console.log(germanFormat.format(number));   // 123.456,789
```

Swap `crypto-js` for `react-native-quick-crypto`:

```diff
-import CryptoJS from 'crypto-js';
-const hash = CryptoJS.SHA256('hello').toString();
+import { createHash } from 'react-native-quick-crypto';
+const hash = createHash('sha256').update('hello').digest('hex');
```

Migrate JS Stack to Native Stack:

```diff
-import { createStackNavigator } from '@react-navigation/stack';
+import { createNativeStackNavigator } from '@react-navigation/native-stack';
-const MyStack = createStackNavigator({ /* same screens */ });
+const MyStack = createNativeStackNavigator({ /* same screens */ });
```

Native bottom tabs:

```tsx
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

const MyTabs = createNativeBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

## Verification
- **Bundle size delta** — run a bundle analyzer before/after; Intl removal alone should be ≥430 kB.
- **TTI delta** — `runJSBundleStart → runJSBundleEnd` shortens proportionally to bytes removed.
- **Navigation FPS** — push a screen in a `<FlatList>`-heavy app. Native Stack keeps JS FPS at 60; JS Stack dips during the transition.
- **Crypto perf** — micro-benchmark SHA-256 over a 1 MB buffer; expect 10×–58× speedup with quick-crypto.

## Edge cases & gotchas
- **Hermes Intl support evolves.** Re-check the support table on each Hermes upgrade.
- **Native Stack has a slightly different API** vs JS Stack (`headerLargeTitle`, gesture options). Some screens need adjustments.
- **Native Tabs look different per-platform** (large iOS, Material Android). That's the point — if your design system demands identical look on both, native tabs are not for you.
- **Zeego on web** falls back to Radix UI — keep that in mind for cross-platform projects.
- **`react-native-quick-crypto` requires the New Architecture** (or a specific RN version range). Confirm compatibility.
- **Locale data files** are often bigger than the polyfill itself — audit which locales you actually ship.
- **Don't replace JS components when no native equivalent exists** or design genuinely demands JS flexibility. The book's stance: push back on *design*, not engineering — *"Great UX is about the dialog between designers' creativity and what's physically possible from an engineering standpoint."*

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Use Dedicated React Native SDKs Over Web", pp. 123–127
- react-native-quick-crypto: https://github.com/margelo/react-native-quick-crypto
- react-native-screens: https://github.com/software-mansion/react-native-screens
- @react-navigation/native-stack: https://reactnavigation.org/docs/native-stack-navigator
- react-native-bottom-tabs: https://github.com/okwasniewski/react-native-bottom-tabs
- Zeego: https://zeego.dev
- @react-native-community/slider: https://github.com/callstack/react-native-slider
- react-native-date-picker: https://github.com/henninghall/react-native-date-picker

## Related skills
- [[rn-perf-analyze-js-bundle]] — measurement tool to verify removed bytes
- [[rn-perf-measure-tti]] — how to measure the TTI win
- [[rn-perf-library-size]] — evaluating individual dep size
- [[rn-perf-tree-shaking]] — ensures unused polyfill data is dropped
- [[rn-perf-avoid-barrel-exports]] — tangential bundle reduction
- [[rn-perf-view-flattening]] — native components plug into the flattening discussion
