---
name: rn-perf-hunt-native-memory-leaks
description: Use when the user suspects a native memory leak in a React Native app — OOM crashes, memory climbing during long sessions, leaks after rotation or navigation cycles, or after the JS-side memory hunt came up empty — drives Xcode Memory Report + Instruments Leaks template on iOS, and Android Studio Profiler "Track Memory Consumption" on Android, plus the canonical EventManager / MainActivity listener-leak fix. Trigger whenever the user mentions native memory leak, OOM, Instruments Leaks, Memory Report, Track Memory Consumption, MainActivity leak, retained instances, configuration-change leak, singleton listener, JNI ref leak, or rotation-induced memory growth.
---

# Hunt Native Memory Leaks

## When to use
After [[rn-perf-hunt-js-memory-leaks]] comes up empty; on OOM crashes after long sessions or repeated configuration changes (rotations, dark-mode toggles); whenever native code involves singletons, static listeners, or instances that should die with a screen but don't.

## What this skill does (single responsibility)
Detect and fix native-side memory leaks using Xcode (Memory Report + **Leaks** template) and Android Studio Profiler (**Track Memory Consumption**). Out of scope: the *theory* of native memory management (see [[rn-perf-native-memory-mgmt]]), JS-side leaks (see [[rn-perf-hunt-js-memory-leaks]]), and CPU profiling (see [[rn-perf-profile-native]]).

## Workflow — iOS

1. Build & run in **Release** — debug allocators behave differently from production.
2. Open **Memory Report** in Xcode's Debug Navigator side pane while the app runs.
3. Reproduce the suspect interaction; watch for **rising-staircase** memory that does not drop on return.
4. If suspicious, stop, then Product → **Profile** → **Leaks** → press record.
5. Reproduce the same flow on device.
6. Wait for the red **"1 new leak"** marker.
7. Click the marker → inspect *Responsible Library*, *Responsible Frame*, *Stack Trace* → double-click frame to jump to source.
8. Apply the fix (typically `delete`, ARC `weak`, or smart pointer rework). Re-record; Leaks should show green.

## Workflow — Android

1. Open Android Studio → Profiler → connect device.
2. Choose **Track Memory Consumption (Java/Kotlin allocations)** → Start.
3. Reproduce the cycle (e.g., rotate device 4 times, navigate in/out repeatedly).
4. Stop. Scroll the lifecycle band to confirm `Activity - stopped - destroyed` labels.
5. Search the class name (e.g., `MainActivity`) in the allocations table.
6. **Read Allocations vs Deallocations**:
   - Allocations = N, Deallocations = 0 → leak.
   - Allocations = N, Deallocations = N → fine.
7. Click the class → **Instance List** shows every still-alive instance with allocation timestamps.
8. Apply the fix (unregister listener, switch to `WeakReference`, implement `AutoCloseable`). Re-run and confirm matched counts.

## Code patterns

iOS C++ leak (book example) — `new` without `delete`:
```cpp
void createNewStrings() {
    for (int i = 0; i < 10; i++) {
        std::string *str = new std::string{"Hey"};
        std::cout << *str;
        // LEAK: never deleted
    }
}
```

Fix — stack allocation, smart pointer, or explicit `delete`:
```cpp
// Stack (preferred — automatic cleanup)
void createNewStrings() {
    for (int i = 0; i < 10; i++) {
        std::string str{"Hey"};
        std::cout << str;
    }
}

// Or smart pointer
auto str = std::make_unique<std::string>("Hey");
```

The canonical Android `EventManager` leak — singleton holds strong listener ref across `MainActivity` recreation:
```kotlin
object EventManager {
    private val listeners = mutableListOf<Callback>()
    fun addListener(callback: Callback) { listeners.add(callback) }
    fun removeListener(callback: Callback) { listeners.remove(callback) }
}

class MainActivity : AppCompatActivity(), Callback {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        EventManager.addListener(this) // LEAK: never removed
    }
    override fun onEvent() { Log.d("MAIN_ACTIVITY", "Hey") }
}
```

Profiler symptom: *MainActivity allocated 4 times, deallocated 0 times* after four rotations.

Fix — unregister in the matching lifecycle method:
```kotlin
class MainActivity : AppCompatActivity(), Callback {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        EventManager.addListener(this)
    }
    override fun onDestroy() {
        EventManager.removeListener(this) // FIX
        super.onDestroy()
    }
    override fun onEvent() { Log.d("MAIN_ACTIVITY", "Hey") }
}
```

Alternative fix: store listeners as `WeakReference<Callback>` — see [[rn-perf-native-memory-mgmt]].

## Verification
- Repeat the **same cycle count** (e.g., 4 rotations, 5 nav cycles) after the fix and confirm:
  - **iOS:** Leaks shows green check; Memory Report returns to baseline.
  - **Android:** Allocations == Deallocations for the suspect class; Instance List is empty after destruction.
- For chronic leaks, run a 100-cycle **soak** and confirm memory stays flat after the working set settles.
- Attach pre-fix / post-fix screenshots to the PR — leak marker → green; non-zero delta → matched counts.

## Edge cases & gotchas
- **React Native opts MainActivity out of recreation** via `android:configChanges` in `AndroidManifest.xml`, so the `EventManager` case is rarer in pure RN apps — but **common when React Native is embedded in an existing native app** or has native screens around RN.
- Same pattern leaks with `Fragment`, `ViewModel`, or any object crossing the singleton/activity boundary.
- **iOS retain cycles** (block captures `self` strongly, `self` retains the block) are usually caught by Leaks template but sometimes only manifest after N navigation cycles — try the suspect flow repeatedly.
- **Allocations template** (separate from Leaks) is for *growth* issues (cache never evicting) rather than true leaks. Memory Report's "high water mark" tells you which.
- **Debug iOS uses different allocators** — always confirm in Release.
- Symbol-stripped release builds hide stack traces — keep **dSYMs** (iOS) and **ProGuard mapping file** (Android) around.
- `WeakReference<Callback>` solves listener leaks elegantly but requires null-checks on every iteration.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "How to Hunt Memory Leaks", pp. 159–167.

## Related skills
- [[rn-perf-native-memory-mgmt]] — the *why* (ARC, GC, smart pointers, WeakReference) behind these leaks.
- [[rn-perf-hunt-js-memory-leaks]] — JS-side sibling; run first.
- [[rn-perf-profile-native]] — CPU sibling using the same toolset.
- [[rn-perf-platform-differences]] — prerequisite mental map.
- [[rn-perf-xcode-instruments]] — deeper Instruments how-to.
- [[rn-perf-android-studio-profiler]] — deeper AS Profiler how-to.
