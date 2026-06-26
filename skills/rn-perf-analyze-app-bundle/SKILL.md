---
name: rn-perf-analyze-app-bundle
description: Use when the user wants to measure native APK/AAB/IPA download and install size of a React Native app — runs Spotify Ruler on Android, Xcode App Thinning Size Report and App Store Connect on iOS, or Emerge Tools X-Ray cross-platform, and wires size thresholds into CI. Trigger whenever the user mentions APK size, AAB size, IPA size, install size, download size, Spotify Ruler, `analyzeReleaseBundle`, App Thinning Size Report, App Store Connect file sizes, Emerge Tools, X-Ray, or asks "why is my app so big to install?" — even without an explicit ask to analyze.
---

# Analyze the Native App Bundle

## When to use
The user wants to know the install or download size of their APK/AAB/IPA, has been told the app is too big, or is wiring up CI thresholds. Google reports a **1% install-conversion drop per 6 MB of APK size** — that's the business reason this number matters.

## What this skill does (single responsibility)
Measures the **native app bundle** (APK/AAB/IPA) on download and on install, and integrates threshold checks into CI. Strictly the platform artifact — it does **not** cover the JS bundle inside the app (see [[rn-perf-analyze-js-bundle]]) or the size fixes themselves (R8, asset catalog, bundle compression).

## Workflow

### Android (Spotify Ruler)
1. Add the Ruler classpath to top-level `build.gradle`.
2. Apply the plugin in `app/build.gradle` and configure the target device profile (`abi`, `locale`, `screenDensity`, `sdkVersion`).
3. Run `cd android && ./gradlew analyzeReleaseBundle` to produce `android/app/build/reports/ruler/release/report.html`.
4. Open the report — top-line shows download and install size; the **Breakdown** tab shows top-down component sizes (`react-android`, `hermes-android`, app code, etc.).
5. Add `verification` thresholds so CI fails on regression.

### iOS (Xcode + App Store Connect)
1. Generate a signed IPA in Xcode.
2. Organizer → **Distribute App** → **Custom** → pick distribution → **App Thinning: All compatible device variants**.
3. Open the exported folder → read `App Thinning Size Report.txt`. Each variant lists compressed (download) and uncompressed (install) size.
4. After uploading to App Store Connect: TestFlight → iOS Builds → expand a build → **App File Sizes** for per-variant download/install sizes. This is the most accurate number (post-DRM, post-recompression).

### Both platforms (Emerge Tools X-Ray)
1. Upload an IPA, APK, or AAB to Emerge.
2. Open the **X-Ray** view (treemap of binary contents: Mach-O sections, string tables, frameworks) or **Breakdown** view.
3. Use **Insights** cautiously — the book warns Emerge suggests removing Hermes, which breaks the app. Verify each suggestion manually.

## Code patterns

Top-level `build.gradle` — Ruler classpath:

```gradle
buildscript {
    dependencies {
        classpath("com.spotify.ruler:ruler-gradle-plugin:2.0.0-beta-3")
    }
}
```

`app/build.gradle` — apply plugin + configure target variant:

```gradle
apply plugin: "com.spotify.ruler"

ruler {
    abi.set("arm64-v8a")
    locale.set("en")
    screenDensity.set(480)
    sdkVersion.set(34)
}
```

Run the report:

```
cd android
./gradlew analyzeReleaseBundle
```

CI threshold enforcement with Ruler:

```gradle
ruler {
    // ...
    verification {
        downloadSizeThreshold = 20 * 1024 * 1024 // 20 MB in bytes
        installSizeThreshold = 50 * 1024 * 1024 // 50 MB in bytes
    }
}
```

`ExportOptions.plist` for `xcodebuild` thinning:

```xml
<key>thinning</key>
<string>&lt;thin-for-all-variants&gt;</string>
```

Sample lines from `App Thinning Size Report.txt`:

```
Variant: SampleApp-FB829A90-8597-43CA-B6ED-6AB3AEAA1C75.ipa
App + On Demand Resources size: 3,5 MB compressed, 10,6 MB uncompressed
App size: 3,5 MB compressed, 10,6 MB uncompressed
On Demand Resources size: Zero KB compressed, Zero KB uncompressed
```

## Verification
- Ruler `analyzeReleaseBundle` produces a `report.html` with non-zero download and install size, and the component breakdown sums to the top-line.
- After applying a fix (R8, asset catalog), the same Ruler / App Thinning report shows the expected reduction — the book's sample app went from 9.5 MB to 6.3 MB download with R8 enabled (~33%).
- CI: configure `downloadSizeThreshold` so a 6 MB regression — Google's "1% conversion drop" threshold — fails the PR.

## Edge cases & gotchas
- **TestFlight ≠ App Store** size. The store does additional DRM and re-compression, which can slightly *increase* final size relative to upload.
- Ruler measures **one ABI variant at a time** — pick `arm64-v8a` for modern Android worst case and document which variant CI thresholds target.
- **Universal IPA is much larger** than any thinned variant — only use it as a worst-case upper bound, not the user-relevant number.
- Emerge's "Strip binary symbols" Insight suggesting a Hermes framework reduction would also strip debug symbols you need for symbolication — only apply if you have a separate symbolication strategy.
- Ruler reports components by **package coordinates** (e.g., `com.facebook.react:hermes-android:0.77.0`) — match these against `node_modules` to find offenders.
- Two metric families: network-bound (download / update) is compressed; storage-bound (install / storage) is uncompressed. Use the metric the user actually cares about.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "How to Analyze App Bundle Size", pp. 181–188.
- Spotify Ruler: https://github.com/spotify/ruler
- Emerge Tools: https://www.emergetools.com
- App Store Connect: https://appstoreconnect.apple.com
- Google's "+6 MB APK → -1% install rate" reference: cited p. 148.

## Related skills
- [[rn-perf-analyze-js-bundle]] — sibling for the JS-side cost.
- [[rn-perf-r8-android-shrink]] — primary Android-side fix (~33% reduction in the book's sample).
- [[rn-perf-native-assets-folder]] — asset-side fix, verified via Emerge X-Ray.
- [[rn-perf-disable-bundle-compression]] — trade-off skill that intentionally increases install size for TTI gain.
- [[rn-perf-library-size]] — pre-flight check to avoid the regression in the first place.
