---
name: rn-perf-flashlight-android
description: Use when the user wants automated FPS / CPU / RAM regression scoring on an Android React Native build, mentions Flashlight CLI, `flashlight measure`, `flashlight test`, Maestro flows, `perf-baseline.json`, "Lighthouse for mobile", or wants a 0–100 performance score that can run in CI. Trigger whenever the user asks about catching perf regressions in pull requests, automated JS-FPS/UI-FPS sampling on Android, comparing builds against a baseline, or integrating perf into GitHub Actions — even if they don't name Flashlight explicitly.
---

# Flashlight (automated Android perf scoring)

## When to use
The user wants automated, regression-grade FPS / CPU / RAM measurement on Android — typically in CI on every PR — and to compare a candidate build against a committed baseline JSON. Flashlight is the only widely-adopted way to do this for React Native.

## What this skill does (single responsibility)
Covers driving Flashlight + Maestro on Android — install, building a release APK, defining a Maestro flow, running `flashlight measure` / `flashlight test`, reading the HTML report, and wiring it into GitHub Actions. Does NOT cover the **interactive** JS-FPS workflow (Perf Monitor) — see [[rn-perf-measure-js-fps]]. Flashlight is **Android-only**; for iOS FPS measurement use [[rn-perf-xcode-instruments]]' Core Animation / Animation Hitches templates.

## Workflow

### Install
```bash
# Flashlight CLI (macOS/Linux)
curl https://get.flashlight.dev | bash
# Windows (PowerShell)
iwr https://get.flashlight.dev/windows -useb | iex

# Maestro (Flashlight's scenario driver) is required
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Build a release-flavor APK
Flashlight only gives honest numbers on release builds (no dev menu overhead, Hermes bytecode):

```bash
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Define a Maestro flow
`.maestro/scroll.yaml`:

```yaml
appId: com.sampleapp
---
- launchApp
- tapOn: "Open List"
- scroll
- scroll
- scroll
- scroll
- scroll
```

### Interactive measurement
1. Boot the perf-reference emulator (see [[rn-perf-simulator-tooling]]).
2. Confirm `adb devices` shows it.
3. Run:
   ```bash
   flashlight measure
   ```
4. Flashlight serves a web dashboard (default `http://localhost:3000`); open it, pick the running app, and drive the app **by hand** — no Maestro flow here.
5. The dashboard graphs FPS/CPU/RAM/threads in real time as you interact.
6. Maestro-driven, scored runs are `flashlight test` (next section); view its results JSON with `flashlight report results.json` — top is the 0–100 score, below are JS FPS, UI FPS, CPU%, RAM (MB), per-thread breakdown.

### Scripted (CI) measurement
```bash
flashlight test \
  --bundleId com.sampleapp \
  --testCommand "maestro test .maestro/scroll.yaml" \
  --duration 10000 \
  --resultsFilePath ./flashlight-results.json \
  --resultsTitle "scroll-test"
```

### Compare against a committed baseline
```bash
# Pass multiple results JSONs (or a folder) to get the comparison view
flashlight report ./flashlight-results.json ./baseline-results.json \
  --output-dir ./flashlight-report
```

Commit `baseline-results.json` as the perf SLA. The comparison report (`flashlight-report/report.html`) shows +/- deltas on JS FPS, CPU, RAM, score.

### Read the report
- **JS FPS** target: ≥ 58 average.
- **UI FPS** target: ≥ 58 on 60 Hz, ≥ 110 on 120 Hz.
- **CPU**: relative — useful for spotting regressions, not absolute thresholds.
- **RAM**: should plateau, not climb. Climbing = leak (see [[rn-perf-hunt-native-memory-leaks]]).
- **Score**: > 80 good, 60–80 needs investigation, < 60 regression.

## Code/command patterns

GitHub Action — runs Flashlight on every PR, uploads HTML report:

```yaml
# .github/workflows/perf.yml
name: Performance regression
on:
  pull_request:

jobs:
  flashlight:
    runs-on: macos-13
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install Flashlight + Maestro
        run: |
          curl https://get.flashlight.dev | bash
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.flashlight/bin" >> $GITHUB_PATH
          echo "$HOME/.maestro/bin"    >> $GITHUB_PATH
      - name: Build release APK
        run: cd android && ./gradlew assembleRelease
      - name: Start AVD
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 32
          target: google_apis
          arch: arm64-v8a
          profile: pixel_5
          script: |
            adb install -r android/app/build/outputs/apk/release/app-release.apk
            flashlight test \
              --bundleId com.sampleapp \
              --testCommand "maestro test .maestro/scroll.yaml" \
              --duration 10000 \
              --resultsFilePath ./pr-results.json
      - name: Compare against baseline
        run: |
          flashlight report ./pr-results.json ./perf-baseline.json \
            --output-dir ./flashlight-report
      - uses: actions/upload-artifact@v4
        with:
          name: flashlight-report
          path: flashlight-report/report.html
```

Multi-iteration for noise reduction:

```bash
flashlight test \
  --bundleId com.sampleapp \
  --testCommand "maestro test .maestro/scroll.yaml" \
  --iterationCount 10 \
  --duration 10000 \
  --resultsFilePath ./results.json
```

`package.json` convenience scripts:

```json
{
  "scripts": {
    "perf:baseline": "flashlight test --bundleId com.sampleapp --testCommand 'maestro test .maestro/scroll.yaml' --resultsFilePath ./perf-baseline.json",
    "perf:check":    "flashlight test --bundleId com.sampleapp --testCommand 'maestro test .maestro/scroll.yaml' --resultsFilePath ./pr-results.json && flashlight report ./pr-results.json ./perf-baseline.json --output-dir ./flashlight-report"
  }
}
```

## Verification
- Run `flashlight measure` once → live web dashboard opens; an idle app should sit at ~60 JS FPS.
- Add a deliberate regression (e.g. `while(true)` on a tap) → re-run → score drops 30+ points.
- The results `.json` should contain ~20 entries in `iterations[].measures` for a 10 s recording — Flashlight samples every 500 ms (`POLLING_INTERVAL = 500` in `@perf-profiler/types`), not per frame.
- CI smoke: run the Action once with no code changes; diff vs baseline within ±2 points.

## Edge cases & gotchas
- **Android-only.** No iOS counterpart in the tool. Use [[rn-perf-xcode-instruments]] (Core Animation / Animation Hitches) on iOS.
- Run on a physical low-end device for CI signal. Emulator scores can be 20+ points higher than a real Pixel 5.
- Maestro flow flakiness is the #1 source of noise. Use `--iterationCount 5+` and `tapOn` with `text` selectors instead of coordinates.
- Flashlight measures the app process, not the system. Other apps eating CPU drop your score. Reboot between CI runs.
- GitHub-hosted runners are slow for emulators. Self-hosted or `macos-13`/`macos-14` with `android-emulator-runner` work best.
- Measure release builds with Hermes. Debug + JSC gives pessimistic numbers that don't reflect production.
- Scores are comparable only across the same flow + same device tier. Pixel 7 vs Pixel 5 is apples-to-oranges.
- The bash installer drops binaries in `~/.flashlight/bin`. Explicitly add to `PATH` in CI; the shell respawn doesn't always preserve it.
- Flashlight Cloud (paid) offers `flashlight cloud test` if you don't want to maintain CI emulators.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), "How to Measure JS FPS", pp. 25–28 (Flashlight on p. 28).
- Book: Libraries/resources acknowledgement section.
- Flashlight: https://flashlight.dev
- Maestro: https://maestro.mobile.dev
- Flashlight source: https://github.com/bamlab/flashlight

## Related skills
- [[rn-perf-measure-js-fps]] — interactive (Perf Monitor) half of the FPS chapter.
- [[rn-perf-simulator-tooling]] — pick the emulator/device Flashlight runs against.
- [[rn-perf-virtualized-lists]] — Flashlight scroll flows are the canonical list-optimisation test.
- [[rn-perf-animations-reanimated]] — animation-heavy screens dip Flashlight scores; this is the fix.
- [[rn-perf-xcode-instruments]] — iOS FPS measurement (no Flashlight equivalent).
- [[rn-perf-android-studio-profiler]] — drill into the hotspot after Flashlight flags a regression.
