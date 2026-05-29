---
name: rn-perf-simulator-tooling
description: Use when the user wants to switch, launch, or manage iOS simulators and Android emulators outside of Xcode/Android Studio — mentions MiniSim, Expo Orbit, Shopify Tophat, the Android iOS Emulator VS Code extension, `xcrun simctl`, `emulator -list-avds`, cold boot vs snapshot, "boot a low-end device", or wants to drag-drop a build URL onto a menu-bar app. Trigger whenever the user complains about dev-loop friction with simulators/emulators, needs to install a teammate's `.apk` / `.ipa` quickly, or wants to set up a baseline perf-reference device — even if they don't explicitly name the tools.
---

# Simulator / emulator tooling (dev-loop friction reducer)

## When to use
The user wants to switch simulators or emulators faster than the Xcode/Android Studio GUI allows, install a teammate's build, or set up a consistent boot path for perf measurement. This is an **optional dev-loop accelerator**, not a perf-fix in itself.

## What this skill does (single responsibility)
Covers picking and driving helper tools (MiniSim, Expo Orbit, Shopify Tophat, the VS Code emulator extension) and the underlying `xcrun simctl` / `emulator` CLIs. Does NOT cover building the app (see [[rn-perf-platform-differences]]), running automated test passes against the chosen device (see [[rn-perf-flashlight-android]]), or what to measure once the device boots (see [[rn-perf-measure-tti]] and [[rn-perf-measure-js-fps]]).

## Workflow

### MiniSim (macOS menu-bar)
1. Install: `brew install --cask minisim`.
2. Launch; a phone icon appears in the menu bar.
3. First run: open Preferences → confirm Android SDK path (defaults to `~/Library/Android/sdk`).
4. Click the menu-bar icon → grouped list: **iOS Devices** (physical), **iOS Simulators**, **Android Emulators**.
5. Click an entry → boots the sim/emulator. Hold `Option` for "Cold boot" (Android).
6. Bottom actions: **Clear Xcode Derived Data**, **Preferences**, **Quit**.

### Expo Orbit (macOS + Windows)
1. Install: `brew install --cask expo-orbit`, or download from https://expo.dev/orbit.
2. Launch; menu-bar icon. Sign in with your Expo account if you want to install builds from EAS.
3. Click the icon → grid of installed simulators/emulators. Drag-drop a `.app`, `.ipa`, `.apk`, or `.aab` onto the menu to install on the active device.
4. EAS integration: paste an EAS build URL → Orbit downloads + installs in one click.

### Shopify Tophat (macOS)
1. Install: download the latest `.dmg` from https://github.com/shopify/tophat/releases (or `brew install --cask shopify-tophat`).
2. Launch; menu-bar icon.
3. Killer feature: paste a remote build URL or CI artifact link → Tophat downloads, picks the right simulator, installs, and launches.

### Android iOS Emulator for VS Code
1. VS Code → Extensions → install "Android iOS Emulator" by `DiemasMichiels` (for the Android+iOS combined extension noted in the book).
2. Confirm Android SDK path in extension settings (`androidEmulator.emulatorPath`).
3. Command Palette (`Cmd+Shift+P`) → "Emulator: Run Android Emulator" → pick AVD. Or "Emulator: Run iOS Simulator".

## Code/command patterns

Underlying CLIs (book p. 74):

```bash
# Android
emulator -list-avds                          # list all AVDs
emulator @Pixel_6_API_34                     # launch a specific AVD
emulator @Pixel_6_API_34 -no-snapshot-load   # cold boot (required for TTI)
adb devices                                  # list running emulators + physical

# iOS
xcrun simctl list                            # list all simulators
xcrun simctl list devices booted             # only currently-booted
xcrun simctl boot "iPhone 15"                # boot by name
xcrun simctl shutdown all                    # stop all
xcrun simctl erase "iPhone 15"               # reset (Erase All Content And Settings)
open -a Simulator                            # open Simulator.app at booted sim
```

Perf-reference boot script (single command, both platforms):

```bash
#!/usr/bin/env bash
# scripts/boot-perf-device.sh
set -euo pipefail
PLATFORM="${1:-android}"
case "$PLATFORM" in
  android)
    AVD="Pixel_5_API_32"
    emulator "@$AVD" -no-snapshot-load -no-boot-anim &
    adb wait-for-device
    ;;
  ios)
    DEVICE="iPhone SE (3rd generation)"
    xcrun simctl boot "$DEVICE" || true
    open -a Simulator
    ;;
  *) echo "usage: $0 [android|ios]" >&2; exit 1 ;;
esac
```

Wait for an iOS sim to finish booting (because `xcrun simctl boot` is async):

```bash
until xcrun simctl list devices | grep -q Booted; do sleep 1; done
```

## Verification
- MiniSim: click → boot an emulator → `adb devices` lists it within ~15 s.
- Expo Orbit: drag a `.app` onto the icon → app installs and appears on the active simulator home screen.
- Shopify Tophat: paste a build URL → status indicator progresses Download → Install → Launch.
- VS Code extension: Command Palette → run emulator command → emulator window appears.

## Edge cases & gotchas
- MiniSim is macOS-only. Linux/Windows users fall back to Expo Orbit (Windows) or direct CLI.
- Multiple tools fighting for the same emulator socket cause `Failed to allocate snapshot`. Pick one driver at a time.
- Apple Silicon: x86_64 Android images require HAXM, which doesn't run on M-series. Use arm64 system images.
- `xcrun simctl boot` is async — pair with the wait loop above when scripting.
- Tophat needs Apple Silicon for some features (Universal builds); Intel Macs see degraded functionality.
- **Cold boot vs snapshot matters for TTI**: snapshots skip kernel boot and distort startup. Always use `-no-snapshot-load` for [[rn-perf-measure-tti]] workflows.
- VS Code marketplace has multiple "Android Emulator" extensions; the book's specific reference is to the combined Android+iOS one. Check the publisher.
- MiniSim's "Clear Xcode Derived Data" is destructive — Xcode re-indexes for 1–3 minutes afterwards.
- Expo Orbit's EAS-build features require an Expo account; local-build installs work without one.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), "Understand Platform Differences", pp. 74–75.
- MiniSim: https://github.com/okwasniewski/MiniSim
- Expo Orbit: https://expo.dev/orbit
- Shopify Tophat: https://github.com/shopify/tophat

## Related skills
- [[rn-perf-platform-differences]] — companion skill on build systems, Podfile, Gradle, deps.
- [[rn-perf-flashlight-android]] — Flashlight runs against the emulator you boot here.
- [[rn-perf-measure-tti]] — TTI measurements depend on cold-boot consistency.
- [[rn-perf-android-studio-profiler]] — uses the emulator picked here.
- [[rn-perf-xcode-instruments]] — uses the simulator picked here.
