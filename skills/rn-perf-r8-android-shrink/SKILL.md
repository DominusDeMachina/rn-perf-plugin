---
name: rn-perf-r8-android-shrink
description: Use when the user wants to shrink Android APK/AAB size, obfuscate code, or strip dead bytecode/resources from a React Native release build — enables R8 minification and resource shrinking in app/build.gradle, adds keep-rules to proguard-rules.pro for reflection-heavy libraries (Firebase, Realm, payment SDKs), and verifies the resulting binary. Trigger whenever the user mentions R8, ProGuard, minifyEnabled, shrinkResources, proguard-rules.pro, enableProguardInReleaseBuilds, -dontobfuscate, keep rules, "release apk is huge", NoClassDefFoundError in release-only, mapping.txt, or asks how to enable code/resource shrinking on Android.
---

# Shrink Android Release Builds With R8

## When to use
The user has a large Android APK/AAB and wants to enable code and resource shrinking, or is hitting reflection-related crashes only in release builds (`NoClassDefFoundError`, `ClassNotFoundException`) and needs ProGuard/R8 keep-rules.

## What this skill does (single responsibility)
Enable R8 minification, obfuscation, and resource shrinking on the Android `release` build type, add keep-rules for libraries that use reflection, and measure the resulting size delta. Does **not** cover JS-bundle minification (Metro handles that via Terser when `--minify true`), iOS shrinking (handled by App Thinning — see [[rn-perf-analyze-app-bundle]]), or asset-density shrinking (see [[rn-perf-native-assets-folder]]).

## Workflow
1. Open `android/app/build.gradle`.
2. Find or add the toggle near the top: `def enableProguardInReleaseBuilds = true`.
3. In the same file, set the `release` build type to enable both code shrinking and resource shrinking (`shrinkResources` requires `minifyEnabled true` — they're a pair).
4. Build a release APK: `cd android && ./gradlew assembleRelease` (or `bundleRelease` for AAB).
5. **Smoke-test the release build** end-to-end — R8 strips classes accessed only via reflection. Pay extra attention to Firebase, Realm, payment SDKs, deep-linking, and any annotation-processor-driven library.
6. For each breakage, add a keep-rule to `android/app/proguard-rules.pro` (templates below).
7. Configure crash-reporter (Crashlytics, Sentry) to upload `mapping.txt` from `android/app/build/outputs/mapping/release/` so stack traces stay readable.
8. Re-measure with Ruler (see [[rn-perf-analyze-app-bundle]]). Book benchmark: **9.5 MB → 6.3 MB, a 33% reduction** on a sample app (pp. 150, 168). Mature apps with many existing keep-rules see 5–20%.

## Code patterns

`android/app/build.gradle` — enable R8 + resource shrinking:

```gradle
def enableProguardInReleaseBuilds = true

android {
    buildTypes {
        release {
            // Enables code shrinking, obfuscation, and optimization
            // for the release build type. Make sure to use a build
            // variant with `debuggable false`.
            minifyEnabled enableProguardInReleaseBuilds

            // Enables resource shrinking, performed by the Android
            // Gradle plugin. `minifyEnabled` must be `true`.
            shrinkResources true
        }
    }
}
```

`android/app/proguard-rules.pro` — example Firebase keep-rule (book p. 168):

```
# Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
```

Disable obfuscation while keeping shrinking (useful when debugging release-only crashes):

```
-dontobfuscate
```

General-purpose keep-rule template for any reflection-driven native module:

```
-keep class com.example.somelibrary.** { *; }
-keepclassmembers class com.example.somelibrary.** { *; }
-dontwarn com.example.somelibrary.**
```

## Verification
- Compare APK/AAB size before and after with Ruler — target roughly 33% on a fresh sample app, 5–20% on mature apps.
- Confirm the app launches and all major flows work in a **release** build — debug builds skip R8 entirely.
- For each reflection-heavy library, do a focused smoke test post-R8.
- Add a CI build that produces a release APK; surface size via Ruler thresholds.

## Edge cases & gotchas
- R8 **replaced ProGuard since RN 0.60** but reuses ProGuard's rules-file format and CLI surface — "proguard" in filenames is expected (book p. 167).
- **Obfuscation is on by default with `minifyEnabled`.** Class/method names become `a`, `b`, `c`. Upload `mapping.txt` to your crash reporter per release, or set `-dontobfuscate` if you don't need it.
- **Hermes/JSC bridge classes** must not be stripped. RN's default ProGuard rules at `proguard-android-optimize.txt` already keep them — don't override unless you know what you're doing.
- **Reflection blind spots**: code called via `Class.forName(...)` or annotation processing disappears silently. Symptom: feature works in debug but `NoClassDefFoundError` in release. Fix: add keep-rule.
- `shrinkResources` performs three optimizations (book p. 168): merges duplicate resources, optimizes PNG files by reducing color depth and applying lossless compression, and processes vector drawables — so it can also touch Metro-packed images in `drawable-*-v4` folders (see [[rn-perf-native-assets-folder]]).
- Build time goes up 10–60s on release. Acceptable.
- The default RN template already has the `enableProguardInReleaseBuilds` flag, usually `false`. Flipping it to `true` is often the entire change.
- `useLegacyPackaging` and similar flags interact subtly with R8 + Hermes packaging — leave at RN template defaults unless you have a specific reason.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Shrink Code With R8 Android", pp. 167–169
- Android docs: https://developer.android.com/build/shrink-code

## Related skills
- [[rn-perf-analyze-app-bundle]] — primary measurement (Ruler shows the size delta)
- [[rn-perf-native-assets-folder]] — complementary Android-side win on image assets
- [[rn-perf-disable-bundle-compression]] — sibling Gradle-flag tweak with a different trade-off (TTI vs. install size)
- [[rn-perf-hunt-native-memory-leaks]] — release build required to reproduce most R8-related crashes
