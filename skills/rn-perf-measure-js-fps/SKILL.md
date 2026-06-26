---
name: rn-perf-measure-js-fps
description: Use when the user wants to measure JS-thread FPS in a React Native app — interactively via Perf Monitor or in CI via Flashlight + Maestro. Trigger whenever the user mentions jank, stutter, dropped frames, "low FPS", "JS FPS", "UI FPS", Perf Monitor, Flashlight, Maestro, 60 fps, 120 fps, or wants automated FPS regression detection — even if they don't explicitly ask to measure frames.
---

# Measure JS-Thread FPS (Perf Monitor and Flashlight)

## When to use
User suspects jank, observes stutter during scroll/animation/typing, or wants automated FPS signal in CI. Also triggers on direct mention of Perf Monitor, Flashlight, Maestro, or comparing UI vs JS FPS.

## What this skill does (single responsibility)
Measures **JS-thread FPS** (and the companion UI-thread FPS) two ways: interactively with the built-in **Perf Monitor** overlay, and automated with **Flashlight + Maestro** on Android. Out of scope: *fixing* low FPS (see the relevant technique skill — virtualized lists, animations, concurrent React), React render profiling ([[rn-perf-profile-js-react]]), and memory leaks ([[rn-perf-hunt-js-memory-leaks]]). This skill produces the number; siblings change it.

## Workflow

### Interactive — Perf Monitor (any platform, any build)
1. Open the dev menu (`Cmd+D` iOS sim, `Cmd+M` Android sim, shake on device).
2. Tap **"Show Perf Monitor"**. An overlay shows `UI` and `JS` FPS.
3. Reproduce the suspect scenario and watch the **JS** counter.
4. Sustained < ~50 fps = a JS-FPS bug. A dip during a specific transition = that interaction is too heavy.
5. For realistic numbers, disable dev mode first: Android — Dev Menu → **Settings** → uncheck **"JS Dev Mode"**; iOS — serve a non-dev bundle from Metro (`dev=false`) or use a release build.

### Automated — Flashlight in CI (Android only)
1. Install the CLI: `curl https://get.flashlight.dev | bash`.
2. Build an Android **release** APK (Flashlight requires release; dev builds give nonsense numbers).
3. Author a Maestro flow describing the scenario at `.maestro/<name>.yaml` (see snippet below).
4. Run `flashlight test --bundleId com.example.app --testCommand "maestro test .maestro/<name>.yaml" --duration 10000 --resultsFilePath results.json`. (`flashlight measure` is the *manual* real-time web dashboard — Maestro-driven runs go through `flashlight test`.)
5. Open the report with `flashlight report results.json`. It surfaces JS FPS, UI FPS, thread CPU, memory, and a 0–100 perf score per scenario.
6. Commit the report's `.json` as the baseline; compare on each PR.

## Code patterns

React Native has **no public JS API** for reading the Perf Monitor's FPS numbers (`Libraries/Performance` only ships `Systrace`) — read FPS from the overlay manually, or use Flashlight for automation. To time a suspect interaction programmatically, use [`react-native-performance`](https://github.com/oblador/react-native-performance) marks/measures:

```ts
import performance from 'react-native-performance';

performance.mark('interactionStart');
runSuspectInteraction();
performance.measure('suspectInteraction', 'interactionStart');
performance.getEntriesByName('suspectInteraction');
// [{ name: 'suspectInteraction', entryType: 'measure', startTime: 98, duration: 123 }]
```

Minimal Maestro flow consumed by Flashlight:

```yaml
appId: com.example.app
---
- launchApp
- tapOn: "Open List"
- scroll
- scroll
- scroll
```

## Verification
- Perf Monitor: sustained ≥ 58 fps JS during the targeted scenario on a **low-end Android device**.
- Flashlight: perf score improves commit-over-commit, or at minimum doesn't regress vs the baseline `.json` in the repo.
- PR description should record before → after JS FPS and the Flashlight score.

## Edge cases & gotchas
- **Flashlight is Android-only.** For iOS, fall back to Xcode Instruments' Core Animation / FPS instrument (see [[rn-perf-xcode-instruments]]).
- Perf Monitor's UI FPS is wall-clock; JS FPS is work-cycles-per-second — they're different units and can legitimately diverge (idle JS, smooth animation).
- Running Flashlight on an emulator is unreliable — physical device only for CI signal.
- Hermes vs JSC produce different FPS profiles; benchmark with the engine you ship.
- Dev builds inflate frame cost — always measure release.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), "How to Measure JS FPS", pp. 25–28.
- Flashlight: https://flashlight.dev
- Maestro: https://maestro.mobile.dev

## Related skills
- [[rn-perf-profile-js-react]] — once an FPS drop is confirmed, profile to find the cause.
- [[rn-perf-virtualized-lists]] — most common cause of scroll-FPS drops.
- [[rn-perf-animations-reanimated]] — most common cause of animation-FPS drops.
- [[rn-perf-flashlight-android]] — deeper Flashlight + CI integration.
