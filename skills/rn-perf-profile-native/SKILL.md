---
name: rn-perf-profile-native
description: Use when the user needs to find slow native code, UI-thread stutter, frozen frames, or CPU spikes in a React Native app — picks the right profiler (Xcode Instruments Time Profiler on iOS, Android Studio CPU Profiler "Find CPU Hotspots" on Android, Perfetto for offline deep analysis) based on symptom and platform, and reads the resulting traces. Trigger whenever the user mentions native jank, microhang, Hang, UI thread, main thread, mqt_v_js, mqt_v_native, libhermes, ShadowTree::commit, RCTMountingManager, Yoga measure, Instruments, Time Profiler, Android Studio Profiler, Perfetto, or asks "why is my native side slow on iOS/Android?".
---

# Profile Native (CPU, threads)

## When to use
After JS profiling has ruled out the JS layer ([[rn-perf-profile-js-react]]), or when a symptom only reproduces on one platform. Use as the entry point for "the UI thread is janky", "main thread microhangs", or "native code is hot" investigations.

## What this skill does (single responsibility)
Picks the platform-correct CPU profiler for a given symptom, runs it correctly, and reads the resulting trace including React Native–specific symbol cheat sheet. Out of scope: tool-driving deep dives (see [[rn-perf-xcode-instruments]], [[rn-perf-android-studio-profiler]], [[rn-perf-perfetto-traces]]), memory profiling (see [[rn-perf-hunt-native-memory-leaks]]), TTI markers (see [[rn-perf-measure-tti]]), and JS profiling (see [[rn-perf-profile-js-react]]).

## Tool selection

| Symptom / target | Tool | Task / template |
|---|---|---|
| iOS UI-thread spike, main thread "Microhang" / "Hang" | **Xcode Instruments** | **Time Profiler** |
| Android UI-thread spike, dropped frames | **Android Studio Profiler** | **Find CPU Hotspots** (Callstack Sample) |
| Offline / deep / multi-CPU / DVFS analysis | **Perfetto** (https://ui.perfetto.dev) | Load exported `.trace` |
| Need single-frame precision, not sampling | System Trace template (Xcode) / *Capture System Activities* (AS) | Instrumentation, not sampling |

## Workflow — iOS (Xcode Instruments)
1. Build a **release** or release-flavor dev scheme — debug builds skew measurements.
2. Xcode → Open Developer Tool → **Instruments** → **Time Profiler**.
3. Choose target (top-left dropdown) → select device + app → press the red record button.
4. Reproduce the suspect interaction; stop after 10–30 s of relevant work.
5. `Cmd +` to zoom on the spike; pin the JS thread (`com.facebook.react.runtime.JavaScript`) to compare side-by-side with the UI thread.
6. Toggle **Call Tree filters**: *Separate by Thread*, *Hide System Libraries*, *Flatten Recursion*, *Invert Call Tree* for bottom-up.
7. Read top-down for "who started this", inverted view sorted by **Weight** for hot leaves. Counts like `3.26 Gc` are sample weight, not milliseconds.

## Workflow — Android (Android Studio Profiler)
1. Build a **profileable** (preferred) or debuggable variant. If Profiler shows "Not running", click *"Profiler: Run 'app' as profileable"*.
2. View → Tool Windows → **Profiler** → choose device/emulator.
3. **Find CPU Hotspots** (Callstack Sample) → Start profiler task.
4. Reproduce the interaction; stop.
5. Inspect the flame graph by thread: UI thread is `android.os.Looper.loopOnce`; JS thread is `mqt_v_js`; Turbo Modules thread is `mqt_v_native`.
6. Use tabs *Summary*, *Top Down*, *Flame Chart*, *Bottom Up*. Filter Bottom Up by keyword (e.g., `hermes`) for engine-attributable cost.
7. Export the `.trace` for offline Perfetto analysis if needed.

## Workflow — Perfetto (offline)
1. Open https://ui.perfetto.dev → "Open trace file" → load the `.trace`.
2. Use for multi-CPU view (Cpu 0…7), CPU frequency overlays (DVFS), `Android Missed Frames`, SurfaceFlinger, SQL Metrics queries.
3. Especially useful for app-startup traces — correlate frequency scaling with on-screen work.

## Symbol cheat sheet (recognise in any trace)
```
mqt_v_js                              -> RN JS thread (Android)
mqt_v_native                          -> RN Turbo Modules thread (Android)
com.facebook.react.runtime.JavaScript -> RN JS thread (iOS/Android)
libhermes.so+0x…                      -> Hermes engine
RuntimeScheduler_Modern::runEventLoop -> RN event loop (JS thread)
ShadowTree::commit / tryCommit / mount-> Fabric commit/mount
yoga::Node::measure                   -> Yoga layout (JS thread)
RCTMountingManager perform…           -> iOS mounting
RCTParagraphTextView drawRect:        -> iOS text drawing
RCTViewComponentView                  -> iOS Fabric view component
```

## Verification
- Re-record after the fix on the **same device** with the same scenario. The hot function's *Weight* / *Total %* should drop measurably (book example: ~240 ms of UI-thread work eliminated).
- Pin the JS thread in both before/after so you can confirm work didn't shift to a different thread.
- For frame-rate impact, confirm **Android Missed Frames** count drops in Perfetto.
- **Profile release builds for absolute numbers; dev builds for relative before/after only.**

## Edge cases & gotchas
- **Single-core %** — Instruments shows CPU per single core; `270.0%` is normal on a multi-threaded RN app.
- **Profile on a low-end device.** The book is explicit: *"Pick the lowest-end device available or emulator for profiling."* Profiling on an iPhone 16 Pro hides problems your Pixel 5 users feel.
- **Sample-based profilers miss short spikes.** For a single 5 ms hitch, switch from Callstack Sample to *System Trace* (instrumentation-based).
- **Symbolication** — raw addresses like `libhermes.so+0xae21c` mean you're profiling a stripped release without dSYMs (iOS) or ProGuard mapping (Android).
- **Profileable vs debuggable on Android** — profileable is closer to production but limits some inspection; start with profileable.
- Block on JS thread doesn't immediately freeze UI — *"You can effectively block the JS thread, and users will still be able to interact with native UI elements"* — so a "responsive" UI doesn't prove the JS thread is healthy.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "How to Profile Native Parts of React Native", pp. 76–84.
- Perfetto: https://ui.perfetto.dev

## Related skills
- [[rn-perf-platform-differences]] — prerequisite mental map for choosing the right toolchain.
- [[rn-perf-xcode-instruments]] — deeper Instruments how-to.
- [[rn-perf-android-studio-profiler]] — deeper AS Profiler how-to.
- [[rn-perf-perfetto-traces]] — deeper Perfetto how-to.
- [[rn-perf-hunt-native-memory-leaks]] — memory sibling using the same toolset.
- [[rn-perf-profile-js-react]] — JS-side sibling; run that first.
- [[rn-perf-threading-model]] — interpreting which thread does what.
- [[rn-perf-measure-tti]] — related but distinct: marker-based, not sample-based.
