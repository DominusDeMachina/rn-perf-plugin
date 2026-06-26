---
name: rn-perf-native-assets-folder
description: Use when a React Native app ships 1x/2x/3x image assets and the user wants only the device-appropriate density to land on the user's phone — routes images through platform-native asset catalogs (Android's auto density-folder routing into `drawable-mdpi-v4` / `drawable-xhdpi-v4` etc., and iOS's explicit `RNAssets.xcassets` opt-in via `EXTRA_PACKAGER_ARGS="--asset-catalog-dest ./"`). Trigger whenever the user mentions @2x/@3x assets, Xcode Asset Catalog, .xcassets, RNAssets.xcassets, drawable-xhdpi / drawable-xxhdpi, EXTRA_PACKAGER_ARGS, App Thinning, asset thinning, "image assets are bloating my app", or wants per-density image delivery on iOS/Android.
---

# Use Platform-Native Asset Catalogs

## When to use
The app bundles 1x/2x/3x PNG/JPG variants and ships all three to every device. On Android with AAB this is mostly automatic; on iOS it requires an explicit opt-in that's not yet default (the 2026 book says this is still true as of March 2026).

## What this skill does (single responsibility)
Make per-density image variants land in **platform-native asset catalogs** so the store ships only the matching density: Android auto-routes via `drawable-*-v4` folders when you build an AAB; iOS opts in via the hard-coded `RNAssets.xcassets` catalog. Does **not** cover image compression itself (use ImageOptim/TinyPNG/squoosh.app — book side note p. 211), general bundle analysis (see [[rn-perf-analyze-app-bundle]]), or non-image assets (fonts, sounds, videos still ship inline).

## Workflow

### Android (mostly automatic)
1. Use size suffixes for all bundled images: `logo.png`, `logo@2x.png`, `logo@3x.png`. `require('./logo.png')` resolves the right density transparently.
2. Build an AAB: `cd android && ./gradlew bundleRelease`.
3. Unzip the AAB (it's a ZIP) and confirm Metro distributed assets into `res/drawable-mdpi-v4`, `drawable-xhdpi-v4`, `drawable-xxhdpi-v4`, `drawable-xxxhdpi-v4` — without `@2x`/`@3x` suffixes (Metro rewrites them).
4. Verify the install-size win with Ruler (see [[rn-perf-analyze-app-bundle]]). Google Play's on-demand compilation ships only the matching folder per device.

### iOS (explicit opt-in)
1. Create the catalog folder at exactly `ios/RNAssets.xcassets`. The name is hard-coded in RN bundle scripts (book p. 213) — custom names won't work.
2. In Xcode, open the target → **Build Phases** → expand **Bundle React Native code and images**.
3. Insert above line 8: `export EXTRA_PACKAGER_ARGS="--asset-catalog-dest ./"`.
4. Build via Xcode (Product → Archive). Metro populates `RNAssets.xcassets` with 1x/2x/3x slots Xcode recognises.
5. Verify in Emerge Tools X-Ray (or by inspecting an App Store Connect thinned IPA): before, three separate `image.jpg` / `image@2x.jpg` / `image@3x.jpg` blocks; after, a single `assets_image_image@3x.jpg` block on a 3x device.
6. Apple's **App Thinning** ships only the matching density per device after App Store processing.

## Code patterns

Size-suffixed asset structure:

```
assets/
├── image.jpg       // 1x resolution
├── image@2x.jpg    // 2x resolution
└── image@3x.jpg    // 3x resolution
```

iOS build phase modification (the load-bearing line, book p. 213):

```bash
export EXTRA_PACKAGER_ARGS="--asset-catalog-dest ./"
```

Sitting inside the **Bundle React Native code and images** script above the existing invocation:

```bash
WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"

export EXTRA_PACKAGER_ARGS="--asset-catalog-dest ./"

/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

Manual iOS bundle command (when running from project root rather than via the Xcode build phase, so `--asset-catalog-dest ios`):

```
npx react-native bundle \
  --entry-file index.js \
  --bundle-output output.js \
  --platform ios \
  --dev false \
  --minify true \
  --asset-catalog-dest ios \
  --assets-dest <your-assets-folder>
```

Android AAB build to inspect (no code change, just verification):

```
cd android
./gradlew bundleRelease
# then unzip android/app/build/outputs/bundle/release/app-release.aab
# and inspect res/drawable-*-v4
```

## Verification
- **Android**: assets appear in `res/drawable-xhdpi-v4`, `drawable-xxhdpi-v4`, etc. without `@2x`/`@3x` suffixes (Metro rewrites them).
- **iOS**: open Xcode and confirm `RNAssets.xcassets` populates 1x/2x/3x slots automatically after a build.
- **iOS post-thinning**: in Emerge X-Ray or by inspecting a thinned IPA from App Store Connect, only **one** density per image is present.
- App-size diff: re-run Ruler (Android) / App Thinning Size Report (iOS). The 3x asset alone is typically ~9× the 1x size, so the win is meaningful for image-heavy apps.

## Edge cases & gotchas
- **The folder name must be exactly `RNAssets.xcassets`.** The path is hard-coded in React Native bundle scripts (book p. 213).
- **Not enabled by default on iOS** as of March 2026 in the 2026 book. Check React Native release notes when upgrading because this may eventually become the default.
- **Only image assets are catalog-handled.** Fonts, sounds, videos still ship in the JS bundle's asset directory; optimise those with compression tools instead.
- **`require('./image.jpg')` still works** — the `@2x`/`@3x` resolution is transparent to JS code. Don't switch to imperative `Image.asset(...)` APIs.
- **AAB vs APK**: the Android win only applies with **AAB** uploads to Play Store (mandatory anyway). Monolithic APKs contain all densities.
- **TestFlight builds may include all variants** — TestFlight ships extra data. The optimisation kicks in only after App Store processing.
- **Workspace caching**: after editing the build phase, do a clean build (delete `ios/build/`) — incremental builds occasionally skip the new packager arg.
- **CocoaPods reinstall not required** — purely a build-phase env var change.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "Use Native Assets Folder", pp. 210–217
- Apple App Thinning: https://developer.apple.com/app-store/app-thinning/
- Image compressors: ImageOptim, TinyPNG, squoosh.app

## Related skills
- [[rn-perf-analyze-app-bundle]] — measurement via Ruler, App Thinning Size Report, Emerge X-Ray
- [[rn-perf-r8-android-shrink]] — complementary Android-side shrinking win
- [[rn-perf-disable-bundle-compression]] — sibling Android Gradle change with a different trade-off
