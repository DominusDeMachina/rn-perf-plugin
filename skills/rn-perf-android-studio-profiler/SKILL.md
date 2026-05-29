---
name: rn-perf-android-studio-profiler
description: Use when the user is opening, navigating, or interpreting Android Studio Profiler or Layout Inspector for a React Native Android app — launching via `View → Tool Windows → Profiler` or `Run → Profile`, picking a task (Find CPU Hotspots, Track Memory Consumption, Capture System Activities, Analyze Memory Usage), switching between Summary / Top Down / Flame Chart / Bottom Up, filtering threads (`mqt_v_js`, `mqt_v_native`, `main`, `pool-2-thread-1`), or exporting a `.trace` / `.perfetto-trace`. Trigger whenever the user mentions Android Studio Profiler, Find CPU Hotspots, Track Memory Consumption, Tasks panel, `ReactSurfaceView`, Layout Inspector, profileable manifest, or asks "how do I attach Profiler to my Android app".
---

# Android Studio Profiler (driver's manual)

## When to use
The user needs to attach Android Studio Profiler to a running RN app, pick a recording task, switch between views, export a trace, or open Layout Inspector to confirm the native view tree.

## What this skill does (single responsibility)
Covers driving Android Studio Profiler and Layout Inspector as tools — task selection, recording, view-dropdown navigation, and exporting `.trace` / `.perfetto-trace` artifacts. Does NOT cover what to do with the findings — see [[rn-perf-profile-native]] for CPU hotspot fixes, [[rn-perf-hunt-native-memory-leaks]] for native leak fixes, [[rn-perf-view-flattening]] for layout-only-view reduction, and [[rn-perf-threading-model]] for interpreting `mqt_v_js` vs `mqt_v_native` vs `main` busy patterns.

## Workflow

### Find CPU Hotspots
1. Open the Android project: `studio android/` from the RN root.
2. Pick a debuggable build (`./gradlew :app:assembleDebug && adb install …`) or set Run → Profile for a profileable variant.
3. `Run → Profile 'app'` (or click the small "Profiler" toolbar icon). Wait for the app to launch.
4. The Profiler tool window opens. Confirm `com.sampleapp` is highlighted in the process list.
5. Tasks pane → **Find CPU Hotspots** (Callstack Sample). "Start profiler task from": **Process start** for startup, **Now** for in-app interactions.
6. Click **Start profiler task**. Reproduce the scenario. Click **Stop**.
7. UI switches to a flame graph. Zoom with `Cmd +` / scroll-wheel; pan with horizontal arrows. Click a frame to inspect.
8. Open the **All threads** dropdown; pin or filter by `mqt_v_js`, `main`, or `pool-2-thread-1`.
9. Switch tabs: **Summary**, **Top Down**, **Flame Chart**, **Bottom Up**. Bottom-Up + name filter "hermes" = the book's go-to bottom-up view.
10. Export: right-click the recording in **Past Recordings** → **Export…** → save as `.trace` (sample) or `.perfetto-trace` (System Trace).

### Track Memory Consumption (Java/Kotlin Allocations)
1. Launch as above (steps 1–4).
2. Tasks pane → **Track Memory Consumption** → Start.
3. Live memory graph appears. Reproduce the action (e.g. rotate device, configuration change).
4. Stop. The Allocation Table shows Class Name, Allocations, Deallocations, Total Count, Shallow Size.
5. Look for rows where Allocations > Deallocations. Book's example: `MainActivity` ×4 alloc / ×0 dealloc → leak from event-listener singleton.
6. Export the heap recording: right-click in Past Recordings → Export.

### Capture System Activities → Perfetto
1. Profiler home → **Capture System Activities** → Start → reproduce → Stop.
2. Recording is captured as Perfetto natively. Right-click → Export → `.perfetto-trace`.
3. Analyse with [[rn-perf-perfetto-traces]].

### Layout Inspector
1. With the app running, `View → Tool Windows → Layout Inspector`.
2. Pick the device + process from the top dropdown.
3. Component Tree fills with native views. Map to JS:
   - `<View />` → `ReactViewGroup`
   - `<Text />` → `ReactTextView`
   - `<Image />` → `ReactImageView`
   - `<ScrollView />` → `ReactScrollView`
4. The right canvas shows a layered render with a "Layer Spacing" slider. Click any view to highlight bounds, padding, ID.

## Code/command patterns

Make a release build profileable for on-device profiling:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:name=".MainApplication"
  android:label="@string/app_name"
  android:profileable="true">
  <profileable android:shell="true" />
</application>
```

CLI export of a system trace (no Android Studio needed):

```bash
adb shell perfetto -o /data/misc/perfetto-traces/trace.perfetto-trace -t 10s \
  -b 32mb sched freq idle am wm gfx view binder_driver hal dalvik camera \
  input res memory
adb pull /data/misc/perfetto-traces/trace.perfetto-trace ~/Desktop/
```

Common RN thread lanes:
- `mqt_v_js` — Hermes JS thread on Android.
- `mqt_v_native` — Turbo Modules / native modules thread.
- `pool-2-thread-1` — Turbo Module invalidation thread.
- `main` — UI thread; pair with `android.os.Looper.loopOnce`.

## Verification
- Capture a CPU recording → Stop → Bottom Up → filter `mqt_v_js`. You should see `libhermes.so+…` frames. If missing, the build isn't running Hermes or you profiled the wrong window.
- Export a `.trace` → close Android Studio → re-open → Import Recording — the same flame graph reappears.
- For Track Memory Consumption: rotate the simulator. Each rotation should bump the live memory graph and add a `MainActivity` allocation. Flat = profiling didn't attach.
- Layout Inspector should list `ReactSurfaceView` at the root under New Architecture.

## Edge cases & gotchas
- Release builds need `<profileable>` in the manifest. Debug builds work out of the box.
- Emulator vs physical: emulator measurements look optimistic. Use a real low-end device for honest numbers (Android fragmentation matters).
- CPU profiler dropdowns are version-sensitive. The "Tasks" model is Meerkat (2024+); older Android Studio shipped "Sample Java methods" etc.
- Process picker shows multiple Hermes runtimes when the app uses multiple surfaces. Confirm `com.sampleapp`, not a `:remote` process.
- System Trace files are huge — easily 50–500 MB. They open in Android Studio Profiler, `ui.perfetto.dev`, or via `traceconv`.
- `mqt_v_js` is Hermes-only. `RCTJSBridge` / `Bridge: Worker` means JSC/legacy build.
- Layout Inspector can't show off-screen content. Scroll the view into the viewport first.
- The new Tasks UI auto-stops after a fixed duration (60 s default for Sample tasks). Stop manually or change duration before starting.
- Bottom-Up "hermes" filter relies on intact symbols. R8 + minify renames app classes; `libhermes.so` stays legible.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), "How to Profile Native Parts of React Native", pp. 80–84.
- Book: same title, "How to Hunt Memory Leaks", pp. 88–90.
- Book: same title, "Use View Flattening", p. 122.
- Android: https://developer.android.com/studio/profile
- Android: https://developer.android.com/studio/profile/cpu-profiler
- Android: https://developer.android.com/studio/profile/memory-profiler
- Android: https://developer.android.com/studio/debug/layout-inspector
- Android: https://developer.android.com/studio/profile/profileable

## Related skills
- [[rn-perf-profile-native]] — what to do with CPU findings.
- [[rn-perf-hunt-native-memory-leaks]] — what to do with allocation findings.
- [[rn-perf-threading-model]] — interpret `mqt_v_js` / `mqt_v_native` / `main` patterns.
- [[rn-perf-view-flattening]] — Layout Inspector verifies layout-only view collapsing.
- [[rn-perf-perfetto-traces]] — analyse exported `.perfetto-trace` files.
- [[rn-perf-xcode-instruments]] — iOS-side counterpart.
- [[rn-perf-react-native-devtools]] — JS-side counterpart.
