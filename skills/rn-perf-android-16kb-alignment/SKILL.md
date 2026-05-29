---
name: rn-perf-android-16kb-alignment
description: Use when preparing a React Native Android release for Google Play, Android 15/API 35+, or devices with 16 KB memory page sizes, or when the user mentions Android 16 KB page size, page-size alignment, `zipalign -P 16`, Play Console 16 KB warnings, unaligned `.so` files, native library alignment, NDK alignment, or crashes on 16 KB Android devices. Verifies release artifacts, traces misaligned native libraries to dependencies, and adds CI checks.
---

# Android 16 KB Page-size Alignment

## When to use
The app targets Android 15/API 35 or later, ships native code or transitive `.so` files, is preparing a Google Play release, or has a Play Console warning about 16 KB page-size compatibility.

## What this skill does (single responsibility)
Verifies Android release artifacts for 16 KB page-size compatibility, traces misaligned shared libraries to React Native or Gradle dependencies, and defines the remediation and CI gate. Out of scope: general app-size analysis ([[rn-perf-analyze-app-bundle]]), R8 shrinking ([[rn-perf-r8-android-shrink]]), and native module performance tuning ([[rn-perf-native-modules-faster]]).

## Workflow
1. **Gate by platform and target.** This is Android-only and matters for apps targeting Android 15/API 35+ or testing on 16 KB page-size devices. Pure Java/Kotlin apps are usually safe; React Native apps often include native `.so` libraries through dependencies.
2. **Build a release artifact.**
   - APK: `cd android && ./gradlew assembleRelease`
   - AAB: `cd android && ./gradlew bundleRelease`
3. **Check APK alignment with Android build tools.** Prefer the exact `zipalign` from the installed Android SDK:
   ```bash
   "$ANDROID_HOME/build-tools/35.0.0/zipalign" -c -P 16 -v 4 android/app/build/outputs/apk/release/app-release.apk
   ```
4. **If releasing an AAB, also test an APK generated from the AAB** with `bundletool build-apks` and the same `zipalign -c -P 16 -v 4` command. Play Console is the final authority for AAB submission warnings.
5. **Trace failures to source packages.** If a library such as `libfoo.so` is misaligned, find where it came from:
   ```bash
   find node_modules android -name "libfoo.so" 2>/dev/null
   grep -R "foo" node_modules/*/android android --include="*.gradle" 2>/dev/null
   ```
6. **Remediate by updating or replacing the dependency.** Repackaging alone is not enough when the ELF load segments are wrong; the native library must be rebuilt or supplied by a compatible version/vendor.
7. **Runtime test on a 16 KB environment.** Use the Android 15+ 16 KB emulator image or a supported Pixel/Samsung device option where available.
8. **Add a release CI check** so a future native SDK update cannot reintroduce a misaligned `.so`.

## Code patterns

CI check for a release APK:

```bash
set -euo pipefail

APK="android/app/build/outputs/apk/release/app-release.apk"
ZIPALIGN="${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools/35.0.0/zipalign"

"$ZIPALIGN" -c -P 16 -v 4 "$APK" 2>&1 | tee alignment.log
if grep -q "Verification FAILED" alignment.log; then
  exit 1
fi
```

Generate and check an APK from an AAB:

```bash
bundletool build-apks \
  --bundle android/app/build/outputs/bundle/release/app-release.aab \
  --output /tmp/app-release.apks \
  --mode universal

unzip -p /tmp/app-release.apks universal.apk > /tmp/universal.apk
"$ANDROID_HOME/build-tools/35.0.0/zipalign" -c -P 16 -v 4 /tmp/universal.apk
```

Trace a failing native library:

```bash
find node_modules android -name "libproblem.so" 2>/dev/null
grep -R "problem" node_modules/*/android android --include="*.gradle" 2>/dev/null
```

## Verification
- `zipalign -c -P 16 -v 4` succeeds on the release APK or generated universal APK.
- Play Console no longer reports 16 KB page-size warnings for the submitted release.
- The app installs and opens on a 16 KB page-size emulator/device.
- CI fails when `zipalign` reports `Verification FAILED`.
- Any updated native dependency has a recorded package/version in the release notes or PR.

## Edge cases & gotchas
- Do not check only debug builds. Release packaging and dependency splits differ.
- Do not omit `-P 16`; the default alignment check is not the 16 KB compatibility check.
- 32-bit ABIs are not the main target. Focus on 64-bit libraries such as `arm64-v8a` and `x86_64`.
- React Native core support does not guarantee every third-party SDK is aligned.
- Re-zipping or manually editing the APK can hide packaging issues but will not fix misbuilt ELF load segments.
- Some Play Console warnings appear only after AAB upload. Keep the local check, but treat Play Console as final release evidence.
- Old NDKs may require linker flags; for app-owned native code, follow Android's official remediation for the NDK version in use.

## References
- Android Developers, Support 16 KB page sizes: https://developer.android.com/guide/practices/page-sizes
- Android Developers, `zipalign`: https://developer.android.com/tools/help/zipalign
- Callstack agent skill: `native-android-16kb-alignment.md` in `callstackincubator/agent-skills`

## Related skills
- [[rn-perf-platform-differences]] - Android Gradle, NDK, and native dependency map
- [[rn-perf-analyze-app-bundle]] - APK/AAB size reports and component breakdown
- [[rn-perf-r8-android-shrink]] - Android release shrinking after compatibility is confirmed
- [[rn-perf-native-modules-faster]] - rebuilding app-owned native modules
- [[rn-perf-android-studio-profiler]] - Android Studio and APK Analyzer workflow
