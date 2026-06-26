---
name: rn-perf-threading-model
description: Use when the user is debugging which thread runs which native code in a React Native New Architecture app — covers Main/UI vs JS vs Turbo Modules thread, sync vs async Turbo Module dispatch, Yoga on the JS thread, and CallInvoker for crossing back. Trigger whenever the user mentions thread contention, blocked UI thread, JS thread starvation, Turbo Modules, Fabric, shadow thread, JSI, mqt_v_js, mqt_v_native, "why is the JS thread blocked", or asks where a particular native method actually runs.
---

# React Native Threading Model (Turbo Modules + Fabric)

## When to use
You're writing or debugging native code in a New Architecture app and need to reason about which thread runs what — for example, the UI freezes when a sync Turbo Module is called, or a UIKit access crashes off the main thread, or Yoga layout work shows up on the JS thread.

## What this skill does (single responsibility)
Installs the threading mental model: which thread executes Turbo Module init, sync calls, async calls, invalidation, Fabric view init, prop updates, and Yoga measurement — on both iOS and Android. Prescribes the sync-vs-async decision rule and how to dispatch correctly. Does **not** cover how to *write* a native module (see [[rn-perf-native-modules-faster]]), native memory management (see [[rn-perf-native-memory-mgmt]]), or how to profile to confirm thread assignment (see [[rn-perf-profile-native]]).

## The three threads

| Thread | iOS name | Android name | Runs |
|---|---|---|---|
| Main / UI | `com.apple.main-thread` | `main` | All view init, prop updates, UIKit access |
| JS | `com.facebook.react.runtime.JavaScript` | `mqt_v_js` | JS code, sync TM methods, Yoga layout |
| Turbo Modules | `com.meta.react.turbomodulemanager.queue` | `mqt_v_native` | Async TM methods |

Additional threads can be spawned by the renderer, your modules, or third-party libraries.

## Turbo Module lifecycle by thread

| Phase | iOS | Android |
|---|---|---|
| `init` (default) | Main thread (if `init` is overridden) | JS thread (`mqt_v_js`) |
| `init` (`needsEagerInit=true`, Android only) | n/a | Turbo Modules thread (`mqt_v_native`) |
| Sync method (e.g., `multiply`) | JS thread | JS thread (`mqt_v_js`) |
| Async method (Promise) | Turbo Modules thread | Turbo Modules thread (`mqt_v_native`) |
| `invalidate` | Turbo Modules thread (must conform to `RCTInvalidating`) | `pool-2-thread-1` (spawned by `ReactHost`) |

iOS defaults `init` to main because RN's source comments: *"If a module overrides `init` then we must assume that it expects to be initialized on the main thread, because it may need to access UIKit."* The check is:

```objc
const BOOL hasCustomInit = [moduleClass instanceMethodForSelector:@selector(init)] != objectInitMethod;
```

To opt into eager init on Android, flip the fourth `ReactModuleInfo` parameter:

```kotlin
moduleInfos[AwesomeLibraryModule.NAME] = ReactModuleInfo(
    AwesomeLibraryModule.NAME,
    AwesomeLibraryModule.NAME,
    false,  // canOverrideExistingModule
    true,   // needsEagerInit  <- Change this to true
    false,  // isCxxModule
    true    // isTurboModule
)
```

## Fabric (native views) threading
- **View init** (`initWithFrame:` on iOS, `createViewInstance` on Android) — main thread.
- **Prop updates** (`updateProps:oldProps:` on iOS) — main thread. RN assumes prop setters directly manipulate native views, so keep them lightweight.

## Yoga's place
Yoga is the cross-platform C++ Flexbox engine. **Yoga measurement (`yoga::Node::measure`, `calculateLayoutImpl`, `computeFlexBasisForChild`) runs on the JS thread.** Slow layout shows up as JS-thread lag, not UI-thread lag. The book notes Yoga is sometimes *faster* than iOS autolayout.

## Sync vs async — the rule of thumb
- **Sync TM** — only for truly cheap operations: returning a constant, a small arithmetic result, a config value. Sync methods run on the JS thread, so they block JS until done.
- **Async TM** — anything > ~1 ms, anything I/O-bound, anything touching network / filesystem / external APIs.

## Code patterns

Anti-pattern — sync TM blocks the entire app:

```swift
@objc func multiply(_ a: Double, b: Double) -> NSNumber {
    Thread.sleep(forTimeInterval: 20)  // Freezes the whole app for 20s
    return a * b as NSNumber
}
```

Correct — async TM offloaded to background:

```swift
@objc func multiplyOnBackgroundThread(
    _ a: Double,
    b: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: RCTPromiseRejectBlock
) {
    DispatchQueue.global().async {
        resolve(a * b)
    }
}
```

Kotlin equivalent using coroutines (full pattern in [[rn-perf-native-modules-faster]]):

```kotlin
override fun multiplyOnBackgroundThread(a: Double, b: Double, promise: Promise?) {
    moduleScope.launch {
        promise?.resolve(a * b)
    }
}
```

When touching UIKit from a background thread on iOS, always dispatch back:

```swift
DispatchQueue.main.async { /* UIKit work */ }
```

When calling back into JS from the Turbo Modules thread, use the JavaScript `CallInvoker` to schedule onto the JS thread.

## Verification
Drop a breakpoint inside the native method and inspect the current thread name in Xcode's Thread pane or Android Studio's Threads & Variables tab:
- Sync TM → expect `mqt_v_js` (Android) / `com.facebook.react.runtime.JavaScript` (iOS).
- Async TM → expect `mqt_v_native` (Android) / `com.meta.react.turbomodulemanager.queue` (iOS).
- View init / prop setter → expect `main` (both platforms).
- Yoga measure → expect the JS thread.

For high-confidence verification, profile in Instruments / Android Studio Profiler — see [[rn-perf-profile-native]].

## Edge cases & gotchas
- A sync TM on iOS without overriding `init` is *also* initialized on the JS thread, not main. Override `init` explicitly if you need main-thread init.
- `needsEagerInit` is Android-only — no iOS equivalent.
- The Turbo Modules thread is a **shared pool**. Long-running work on it blocks every other module's async calls. For work over a few hundred ms, spawn your own `DispatchQueue` / `CoroutineScope`.
- Yoga slowness manifests as JS-thread lag, not UI-thread lag. Profile the JS thread when layout feels heavy.
- Fabric view prop setters run on **main**; the Shadow Tree commit phase runs in C++ on its own slice — don't conflate them.
- Android's invalidation thread (`pool-2-thread-1`) has an auto-generated name; don't assert on it in tests.
- Touching UIKit (`UIView`, `UILabel`) off the main thread on iOS will crash or behave inconsistently. Always `DispatchQueue.main.async`.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "Understand the Threading Model of Turbo Modules and Fabric", pp. 126–135
- React Native New Architecture docs: https://reactnative.dev/architecture/landing-page

## Related skills
- [[rn-perf-native-modules-faster]] — operational counterpart for writing fast native modules using this thread knowledge
- [[rn-perf-profile-native]] — how to verify which thread is actually running what
- [[rn-perf-platform-differences]] — prerequisite mental model
- [[rn-perf-view-flattening]] — Yoga layout cost lives on the JS thread
- [[rn-perf-measure-tti]] — `runJSBundleStart/End` runs on the JS thread
- [[rn-perf-native-memory-mgmt]] — `CallInvoker` and `Unmanaged` interop have ARC implications
