---
name: rn-perf-measure-tti
description: Use when the user wants to measure Time to Interactive (TTI) / app start time in a React Native app — installs the five official RN markers (nativeAppStart/End, appCreationStart/End, runJSBundleStart/End, contentAppeared, screenInteractive) via the react-native-performance library, detects cold vs prewarm vs warm starts so only like-for-like is compared, and reports cold-start medians + p90s to a RUM backend. Trigger whenever the user mentions TTI, time to interactive, app start time, cold start, warm start, prewarm, ActivePrewarm, screenInteractive, contentAppeared, runJSBundle, react-native-performance, nativeLaunchStart, or asks "how do I measure how long my app takes to open?".
---

# Measure Time to Interactive (TTI)

## When to use
The user wants to measure app start time, compare TTI between releases, set up RUM reporting for cold starts, or has confused themselves with `nativeLaunchStart` (which includes iOS prewarm) and is comparing apples to oranges.

## What this skill does (single responsibility)
Measure end-to-end TTI with the official RN markers via `react-native-performance`, classify start type (cold / warm / hot / prewarm), report only cold-start data to a RUM platform, and define `screenInteractive` correctly for *your* app. Out of scope: *optimizing* TTI (covered by [[rn-perf-analyze-js-bundle]], [[rn-perf-analyze-app-bundle]], [[rn-perf-rn-sdks-over-web]], [[rn-perf-react-compiler]]), and FPS measurement ([[rn-perf-measure-js-fps]]).

## The five official markers

| Pipeline stage | Marker pair |
|---|---|
| 1. Native Process Init | `nativeAppStart` → `nativeAppEnd` |
| 2. Native App Init | `appCreationStart` → `appCreationEnd` |
| 3. JS Bundle Load | `runJSBundleStart` → `runJSBundleEnd` |
| 4. RN Root View Render | `contentAppeared` |
| 5. React App Render | `screenInteractive` |

Library: **`react-native-performance`** by oblador. iOS class `ReactNativePerformance.RNPerformance`; Android class `com.oblador.performance.RNPerformance`.

## Cold-start detection (critical — naïve timing is meaningless)

iOS may "prewarm" — run initializers preemptively, sometimes hours before `main()`. Android may resume a backgrounded process with no native init. **Only compare cold starts to cold starts.**

**iOS:** check the `ActivePrewarm` env var.
```swift
let isColdStart = ProcessInfo.processInfo.environment["ActivePrewarm"] == "1" ? false : true
```

**Android:** the `firstPostEnqueued` trick — a `Handler().post` runs *before* any `Activity.onCreate` only when the process started fresh.
```kotlin
class MainApplication : Application(), ReactApplication {
    var isColdStart = false
    override fun onCreate() {
        super.onCreate()
        var firstPostEnqueued = true
        Handler().post { firstPostEnqueued = false }
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                unregisterActivityLifecycleCallbacks(this)
                if (firstPostEnqueued && savedInstanceState == null) {
                    isColdStart = true
                }
            }
        })
    }
}
```

**Foreground guard.** TTI is meaningless for a background launch.
- iOS: `application.applicationState == .active` inside `didFinishLaunchingWithOptions`.
- Android: `ActivityManager.getMyMemoryState(processInfo); processInfo.importance == IMPORTANCE_FOREGROUND`.

## Workflow

1. `npm install react-native-performance`; confirm autolinking on both platforms.
2. **Classify the start type early.** iOS `ActivePrewarm`; Android `firstPostEnqueued`. Add the foreground guard. Drop measurements that aren't cold + foreground.
3. **Hook the four pipeline markers** using the library defaults or the patterns below — `nativeAppStart/End`, `appCreationStart/End`, `runJSBundleStart/End`, `contentAppeared`.
4. **Pick a `screenInteractive` location appropriate to your app** — the first screen the user actually lands on and can meaningfully interact with (not just the navigation container mount). Typically the first `useEffect` of the landing screen.
5. **Send marker data to a RUM platform** (Datadog, Firebase Performance, Sentry, custom HTTP). Tag every event with `isColdStart` and platform.
6. Compute **median + p90 of `nativeAppStart → screenInteractive`** for cold starts only.

## Code patterns

`screenInteractive` placement (app-specific — your call):
```tsx
import performance from 'react-native-performance';

export default function HomeScreen() {
  useEffect(() => {
    performance.mark('screenInteractive');
  }, []);
  return <TabNavigator {...} />;
}
```

Read markers from JS:
```ts
import performance from 'react-native-performance';

performance.measure('nativeAppStart', undefined, 'nativeAppEnd');
const [{ startTime, duration }] = performance.getEntriesByName('nativeAppStart');
```

Custom native markers:
```swift
// iOS
import ReactNativePerformance
RNPerformance.sharedInstance().mark("myCustomMark")
```
```kotlin
// Android
import com.oblador.performance.RNPerformance
RNPerformance.getInstance().mark("myCustomMark")
```

iOS — bundle-load-end via NotificationCenter:
```swift
NotificationCenter.default.addObserver(
    self,
    selector: #selector(emit),
    name: NSNotification.Name("RCTJavaScriptDidLoadNotification"),
    object: nil
)
```

Android — `ReactMarker` listener:
```kotlin
ReactMarker.addListener { name ->
    when (name) {
        ReactMarkerConstants.RUN_JS_BUNDLE_END -> RNPerformance.getInstance().mark("runJSBundleEnd")
        ReactMarkerConstants.CONTENT_APPEARED  -> RNPerformance.getInstance().mark("contentAppeared")
        else -> {}
    }
}
```

## Verification
- Take **50–100 cold-start measurements per platform** under realistic conditions; compute median + p90 of `nativeAppStart → screenInteractive`.
- After an optimisation, compare medians and p90s — at minimum no regression, ideally measurable reduction.
- Confirm warm/prewarm measurements are **excluded** — otherwise you're measuring iOS's prediction quality, not your code.
- Add a CI/CD smoke check on a real or stable-emulator device re-running the markers after each merge.

## Edge cases & gotchas
- **`nativeLaunchStart`** (built-in to `react-native-performance`) is measured **pre-main**, so it includes prewarm. Filter it out or create a custom marker inside `main()` for true cold-start origin.
- **iOS prewarming** can run initializers hours before `main()` — naïve subtraction of `main()` start from process start over-reports.
- Android background launches still execute `onCreate` — always apply the foreground guard.
- **`screenInteractive` is app-specific** — not the navigation container mount, not a splash screen, but the first place users can do something useful.
- Don't measure TTI in dev / debug builds for absolute numbers — Metro injection + dev overlays cost real time.
- TTFV (Time To First Visible) ≈ `contentAppeared`; TTI ≈ `screenInteractive`. Some teams want both — keep them distinct.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "How to Measure TTI", pp. 91–98.
- `react-native-performance`: https://github.com/oblador/react-native-performance

## Related skills
- [[rn-perf-platform-differences]] — prerequisite for where each marker lives.
- [[rn-perf-threading-model]] — explains why `runJSBundleStart/End` happens on the JS thread.
- [[rn-perf-analyze-js-bundle]] — the most common TTI improvement (strip eagerly-run code).
- [[rn-perf-analyze-app-bundle]] — native bundle composition affects TTI.
- [[rn-perf-rn-sdks-over-web]] — removing Intl polyfills shaves >400 kB; improves `runJSBundleEnd → screenInteractive`.
- [[rn-perf-react-compiler]], [[rn-perf-uncontrolled-components]] — JS-side reductions that improve TTI.
