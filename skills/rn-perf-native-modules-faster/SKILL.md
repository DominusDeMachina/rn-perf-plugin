---
name: rn-perf-native-modules-faster
description: Use when the user is writing or speeding up a custom React Native native module — scaffolding with `create-react-native-library` (Builder Bob), choosing Turbo vs Nitro vs Fabric view vs Legacy, adding Swift via the Obj-C++ bridging-header recipe, using Kotlin coroutines with `moduleScope` cancellation in `invalidate()`, offloading work to `DispatchQueue.global()` / `Dispatchers.Default`, registering C++ Turbo Modules via `+ load`, or weighing language-boundary costs (JNI, Obj-C dynamic dispatch, Swift+C++ interop). Trigger whenever the user mentions writing a native module, Turbo Module, Nitro Module, Fabric view, create-react-native-library, Builder Bob, Swift bridging header, RCT_EXTERN_METHOD, Kotlin coroutines in a module, or C++ Turbo Module.
---

# Make Your Native Modules Faster

## When to use
You're authoring a custom native module or view for a React Native app and want it to be as fast as possible — pick the right module type, write in Swift/Kotlin/C++ correctly, and never block the JS thread.

## What this skill does (single responsibility)
Operational guide to building performant custom native modules: scaffold with `create-react-native-library`, pick a module type, apply the Swift bridging recipe, use Kotlin coroutines with proper cancellation, register C++ Turbo Modules, and understand the hidden cost of each language boundary. Does **not** cover *consuming* third-party modules (see [[rn-perf-rn-sdks-over-web]]), measurement (see [[rn-perf-profile-native]]), threading theory (see [[rn-perf-threading-model]]), or native memory management (see [[rn-perf-native-memory-mgmt]]).

## Step 1: scaffold with Builder Bob

```bash
npx create-react-native-library@latest library-name
```

Choose the **module type**:

| Type | When to pick |
|---|---|
| **Turbo Module** | JS-callable API, no native UI, written in Kotlin/Swift |
| **Nitro Module** | Same as Turbo but maximum speed via C++ / Swift–C++ interop |
| **Fabric view** | Custom native UI component with custom rendering |
| **C++ Turbo Module** | Cross-platform shared logic (algorithms, parsing, crypto) |
| **Legacy Native module / view** | Only for maintaining old-architecture libraries — never start new code here |
| **JavaScript library** | No native code |

Pass `--local` for an in-app module instead of a publishable npm package. Builder Bob generates Kotlin by default; Swift is optional on iOS.

## Step 2: use modern languages

- **Android — Kotlin.** Builder Bob's default. Fully interoperable with Java; parts of RN itself are already Kotlin.
- **iOS — Swift implementation + Obj-C++ bridge.** Swift's C++ interop is still experimental; Obj-C++ is mature and RN iOS internals rely on it. The safe pattern is a Swift extension exposed via `RCT_EXTERN_METHOD` in a `.mm` file.

### Swift bridging recipe

1. **Podspec** — allow Swift source files:

```diff
- s.source_files = "ios/**/*.{h,m,mm,cpp}"
+ s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
```

2. **Create a Swift file** inside `ios/` from Xcode; accept the prompt to create a Bridging Header.

3. **Library header (`AwesomeLibrary.h`)** — gate the codegen import behind `__cplusplus` so Swift can ignore C++ types:

```diff
#import <Foundation/Foundation.h>

+ #if __cplusplus
#import "ReactCodegen/RNAwesomeLibrarySpec/RNAwesomeLibrarySpec.h"
+ #endif

@interface AwesomeLibrary : NSObject
+                       #if __cplusplus
                          <NativeAwesomeLibrarySpec>
+                       #endif
@end
```

4. **Bridging header** — import the library header so Swift sees the class:

```objc
+ #import "AwesomeLibrary.h"
```

5. **Swift extension** — implement the method, expose to Obj-C via `@objc`:

```swift
import Foundation

extension AwesomeLibrary {
    @objc func multiply(_ a: Double, b: Double) -> NSNumber {
        a * b as NSNumber
    }
}
```

6. **`.mm` Obj-C++ file** — `RCT_EXTERN_METHOD` remaps the Swift call:

```objc
#import "AwesomeLibrary.h"

#if __has_include("awesome_library/awesome_library-Swift.h")
#import "awesome_library/awesome_library-Swift.h"
#else
#import "awesome_library-Swift.h"
#endif

@implementation AwesomeLibrary

RCT_EXPORT_MODULE()
RCT_EXTERN_METHOD(multiply:(double)a b:(double)b);

@end
```

The book notes ongoing efforts to support Swift by default — this boilerplate may go away.

## Step 3: offload work from the JS thread

By default, **sync** Turbo Module methods run on the JS thread (see [[rn-perf-threading-model]]). Anything more than trivial compute must be **async** and offloaded.

### iOS — `DispatchQueue.global()`

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

### Android — Kotlin coroutines with `moduleScope`

```kotlin
@ReactModule(name = AwesomeLibraryModule.NAME)
class AwesomeLibraryModule(reactContext: ReactApplicationContext) :
    NativeAwesomeLibrarySpec(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun invalidate() {
        super.invalidate()
        moduleScope.cancel()       // important — cancel on RN reload
    }

    override fun multiplyOnBackgroundThread(a: Double, b: Double, promise: Promise?) {
        moduleScope.launch {
            promise?.resolve(a * b)
        }
    }
}
```

**Cancel the scope in `invalidate()`** or you leak coroutines on every Metro reload. From the book: *"Remember to cancel the scope when the module gets invalidated. This makes sure that we don't introduce any memory leaks."*

## Step 4: shared logic in C++

For cross-platform logic (image processing, crypto, algorithms), write once as a **C++ Turbo Module** and skip Obj-C / Kotlin entirely.

C++ Turbo Modules **don't yet support autolinking on iOS**. Register from `+ load` (Obj-C runtime hook that fires once at app launch):

```objc
#include <ReactCommon/CxxTurboModuleUtils.h>

@implementation YourModule

+ (void)load {
    facebook::react::registerCxxModuleToGlobalModuleMap(
        std::string(facebook::react::YourModule::kModuleName),
        [&](std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
            return std::make_shared<facebook::react::YourModule>(jsInvoker);
        });
}

@end
```

Android autolinks C++ Turbo Modules normally.

## Hidden costs of language boundaries

1. **Objective-C** — dynamic dispatch. Every Obj-C method call requires a method-table lookup. Obj-C Turbo Modules pay this per call.
2. **Objective-C++** — mixing Obj-C with C++ is **near-zero cost**; the compiler treats the file as native C++. Lookup kicks in only when an actual Obj-C method is invoked.
3. **Swift ↔ C++** — Swift uses vtables per class like C++. Interop is **near-zero cost**. *"That's one of the reasons why switching to Nitro Modules that skip Objective-C and use C++ interoperability can give you a significant performance boost."*
4. **JNI** — every Kotlin/Java ↔ C++ call requires a function lookup. **C++ Turbo Modules** pay JNI only once at initialization; subsequent calls go directly through JSI without JNI.

## Workflow
1. Scaffold with `npx create-react-native-library@latest <name>`; pick Turbo / Nitro / Fabric view.
2. Plan threading up front: which methods are sync + trivially cheap, which are async + need a background thread (see [[rn-perf-threading-model]]).
3. Enable Swift on iOS via the bridging recipe; add `@objc` to every method exposed to `RCT_EXTERN_METHOD`.
4. On Android, hold a `CoroutineScope`, launch background work on `Dispatchers.Default`, **cancel in `invalidate()`**.
5. For shared logic, write C++ once — `registerCxxModuleToGlobalModuleMap` on iOS, autolink on Android.
6. Verify the thread at a breakpoint (see [[rn-perf-threading-model]] for the thread-name cheat sheet).
7. Measure with Instruments / Android Studio Profiler (see [[rn-perf-profile-native]]).

## Verification
- **Breakpoint thread check** — `multiplyOnBackgroundThread` should land on `DefaultDispatcher-worker-1` (Android) or `com.apple.root.default-qos` (iOS), **not** `mqt_v_js` / `main`.
- **JS FPS under load** — should stay at 60 even while the native method runs (proof JS isn't blocked).
- **Latency** — compare Obj-C TM vs Nitro/C++ TM call latency for hot methods.
- **Memory leak check** — on Metro reload, `moduleScope` should cancel and in-flight coroutines should stop. Verify with Android Studio Profiler that the module instance deallocates.

## Edge cases & gotchas
- **Sync TM methods always run on the JS thread.** A `Thread.sleep(20)` (or any blocking I/O) inside a sync method freezes the whole app.
- **Forgetting to cancel `moduleScope`** in `invalidate()` is a classic native memory leak — JS reloads accumulate stale coroutines.
- **C++ Turbo Modules + iOS autolinking** isn't yet supported; the `+ load` workaround is required. Watch for when the RN team adds autolinking.
- **One bridging header per target.** If multiple Swift-using modules collide, they must share or coordinate.
- **`@objc`** — Swift methods without `@objc` are invisible to Obj-C and therefore to `RCT_EXTERN_METHOD`.
- **Codegen + `#if __cplusplus`** — Swift can't parse C++ types, so codegen headers must be gated behind `__cplusplus` macros in the library header.
- **Nitro Modules require Hermes** and a recent RN version. Check the compat matrix.
- **Builder Bob's options change** — re-check available module types on each release.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Make Your Native Modules Faster", pp. 128–135
- Builder Bob / create-react-native-library: https://github.com/callstack/react-native-builder-bob
- Nitro Modules: https://github.com/mrousavy/nitro
- C++ Turbo Modules: https://reactnative.dev/docs/the-new-architecture/cxx-cxxturbomodules

## Related skills
- [[rn-perf-threading-model]] — prerequisite theory for *why* the threading patterns work
- [[rn-perf-native-memory-mgmt]] — prerequisite for ARC / smart pointers / `Unmanaged`
- [[rn-perf-profile-native]] — verify the resulting thread / performance
- [[rn-perf-platform-differences]] — prerequisite for Podfile / Gradle layout
- [[rn-perf-hunt-native-memory-leaks]] — when a coroutine isn't cancelled, hunt the leak here
- [[rn-perf-view-flattening]] — relevant when building a Fabric view that takes children
- [[rn-perf-rn-sdks-over-web]] — prefer existing native modules over rolling your own when possible
