---
name: rn-perf-react-native-devtools
description: Use when the user is launching, attaching, navigating, or troubleshooting React Native DevTools — pressing `j` in Metro, opening the Dev Menu, switching among the Components / Profiler / Memory / JavaScript Profiler panels, enabling experiments, or saving/loading `.cpuprofile` / `.heapsnapshot` / `.heaptimeline` artifacts. Trigger whenever the user mentions React Native DevTools, "Open DevTools", Hermes inspector, "DevTools won't connect", Highlight updates, "Record why each component rendered", or asks how to drive any DevTools panel — even if they don't explicitly say "DevTools".
---

# React Native DevTools (driver's manual)

## When to use
The user wants to attach DevTools to a running RN app, switch between panels, enable profiling-friendly settings, or recover from a "DevTools won't connect" situation. Also applies whenever they ask how to save or load a `.cpuprofile`, `.heapsnapshot`, or `.heaptimeline` round-trip.

## What this skill does (single responsibility)
Covers driving React Native DevTools as a tool — launching, attaching, panel anatomy, settings toggles, and artifact save/load. Does NOT cover what to do inside each panel: see [[rn-perf-profile-js-react]] for the Profiler workflow, [[rn-perf-hunt-js-memory-leaks]] for the Memory tab workflow, and [[rn-perf-measure-js-fps]] for FPS measurement. Native-side counterparts are [[rn-perf-xcode-instruments]] (iOS) and [[rn-perf-android-studio-profiler]] (Android).

## Workflow
1. Pre-flight: start Metro with `npx react-native start` (or `npm run start`); build and launch the app on a device/simulator.
2. Launch DevTools two ways:
   - Press `j` in the Metro terminal window, or
   - Open the Dev Menu (`Cmd+D` iOS sim, `Cmd+M` Android emulator, shake on device) → tap "Open DevTools".
3. Verify attach: the window title should read e.g. `SampleApp (sdk_gphone64_arm64) — React Native DevTools`. If it only shows "Welcome" with no target, fix the LAN/Hermes preconditions (see Edge cases).
4. Toggle profiling-friendly settings (gear icon, top right):
   - General → enable "Highlight updates when components render".
   - Profiler → enable "Record why each component rendered while profiling".
   - Experiments → enable "JavaScript Profiler" if hidden.
5. Choose the build deliberately. Use `__DEV__=true` only for render-correctness exploration. For measurement, ship a release/profiling build — dev mode adds 2–10× overhead. On Android: Dev Menu → Settings → uncheck "JS Dev Mode".
6. Record an artifact in the relevant panel (blue dot start / square stop). Use "Reload and start profiling" (curved-arrow icon) for startup traces. Hand off the specifics to the technique skill linked above.
7. Save the artifact: down-arrow icon (Profiler / JS Profiler), or right-click the snapshot in the left rail → "Save…" (Memory).
8. Load a previously saved artifact: up-arrow icon in the matching panel, then pick the file.
9. Tear down: close the window. DevTools persists across reloads, but a fresh JS context (`r` in Metro) forces re-attach.

## Panel map
- **Welcome** — entry-point links to docs.
- **Console** — JS `console.log` plus a REPL.
- **Sources** — source files (with Hermes source maps), breakpoints, watch.
- **Memory** — heap snapshot, allocation instrumentation on timeline, allocation sampling. See [[rn-perf-hunt-js-memory-leaks]].
- **Components** — React tree, props, hooks; flashes the "Highlight updates" overlay when the General setting is on.
- **Profiler** — React commit flamegraph, Ranked view, "Why did this render?". See [[rn-perf-profile-js-react]].
- **JavaScript Profiler** (experimental, gear → Experiments to enable) — CPU sampler with Chart / Heavy (Bottom-Up) / Tree views.

## Code/command patterns

Force a reload from JS (mirrors "Reload and start profiling"):

```ts
import { DevSettings } from 'react-native';
DevSettings.reload();
```

Wrap a target subtree with React's `Profiler` API to make it a named entry in the flamegraph:

```tsx
import { Profiler } from 'react';

<Profiler id="ProductList" onRender={() => {}}>
  <ProductList />
</Profiler>
```

Save/load file suffixes per panel:
- Profiler → React profile `.json` (RN DevTools' own format; does NOT load in Chrome).
- JavaScript Profiler → `.cpuprofile`.
- Memory → `.heapsnapshot` (heap snapshot) or `.heaptimeline` (allocation timeline).

## Verification
- A blank recording produces an empty Profiler flamegraph and an idle-only JS Profiler stack — confirms attach is working.
- Round-trip a `.cpuprofile`: save → close DevTools → reopen → load — the chart should render identically.
- Tap an element in the running app; the Components panel should flash green outlines around re-rendered elements. If not, "Highlight updates" is off.

## Edge cases & gotchas
- Device and host must share a LAN. Cellular, hotel guest Wi-Fi with client isolation, and corporate VPNs will block CDP.
- DevTools requires Hermes. JSC builds will not attach.
- No JavaScript Profiler tab visible? Gear → Experiments → enable "JavaScript Profiler".
- Multiple JS contexts appear as separate target rows in the Memory panel's "Select JavaScript VM instance" list — pick the right one before recording.
- Dev-mode skew: dev builds run 2–10× slower. Use them only for relative comparisons; turn off JS Dev Mode for absolute numbers.
- "Reload and start profiling" wipes in-memory state. Use deliberately for startup, not as a generic refresh.
- DevTools UI ships independently of RN — button positions can shift across versions; rely on tooltips and icons, not labels.
- The React Profiler `.json` is a custom format. Don't try to load it in Chrome DevTools; load it back into the RN DevTools Profiler tab.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), "How to Profile JS and React Code", pp. 16–24.
- Book: same title, "How to Hunt JS Memory Leaks", pp. 29–36.
- Official docs: https://reactnative.dev/docs/react-native-devtools
- Chrome DevTools: https://developer.chrome.com/docs/devtools
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/

## Related skills
- [[rn-perf-profile-js-react]] — what to do inside the Profiler / JS Profiler panels.
- [[rn-perf-hunt-js-memory-leaks]] — what to do inside the Memory panel.
- [[rn-perf-measure-js-fps]] — Perf Monitor as the in-app FPS overlay; DevTools complements it.
- [[rn-perf-xcode-instruments]] — native-side counterpart on iOS.
- [[rn-perf-android-studio-profiler]] — native-side counterpart on Android.
- [[rn-perf-perfetto-traces]] — system traces that correlate JS and native lanes.
