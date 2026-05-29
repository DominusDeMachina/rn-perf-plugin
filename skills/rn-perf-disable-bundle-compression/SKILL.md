---
name: rn-perf-disable-bundle-compression
description: Use when the user wants to speed up Android cold start / TTI in a React Native + Hermes app by letting Hermes memory-map the JS bundle instead of decompressing it at startup — adds `androidResources { noCompress += ["bundle"] }` to `android/app/build.gradle`, with a measured trade-off of roughly +8% install size for -16% TTI. Trigger whenever the user mentions Hermes mmap, noCompress, androidResources, index.android.bundle compression, slow Android cold start despite Hermes, Marc Rousavy's PR, "why is RN slow to launch on Android", "Hermes isn't mmap-ing", "tiny Gradle flag with huge TTI impact", or asks why install size went up after a Gradle change.
---

# Disable Android JS Bundle Compression

## When to use
The user has a Hermes-based React Native app and slow Android cold start, or they're on RN < 0.79 and want to opt into Hermes' mmap fast-path. Android compresses `index.android.bundle` by default, and a compressed file cannot be memory-mapped — so Hermes silently falls back to decompress-then-load on startup.

## What this skill does (single responsibility)
Add `noCompress += ["bundle"]` to the `androidResources` block in `android/app/build.gradle` so Android packages the JS bundle uncompressed and Hermes can `mmap` it directly. Does **not** apply to iOS (different packaging model), JSC (no mmap path), or other Hermes/native tuning (see [[rn-perf-measure-tti]] and [[rn-perf-threading-model]]).

## Workflow
1. **Check the React Native version.**
   - **≥ 0.79** — already the default (book p. 175). Inspect generated `build.gradle` to confirm; otherwise skip this skill.
   - **< 0.79** — apply the change below.
2. Edit `android/app/build.gradle` and add an `androidResources` block under `android { ... }`.
3. Build a release APK: `cd android && ./gradlew assembleRelease`.
4. Confirm uncompressed bundle: `unzip -l <apk> | grep index.android.bundle` — the "size" and "compressed size" columns should match.
5. Measure before/after:
   - APK install size with Ruler (see [[rn-perf-analyze-app-bundle]]) — expect a modest increase (book: +6.1 MB, +8% on a 75.9 MB sample).
   - TTI with [[rn-perf-measure-js-fps]] / Flashlight — expect a measurable drop (book: -450 ms, -16% on the same sample).
   - Download size: **unchanged** (Play Store still compresses for transport).
6. Ship if the trade-off is favourable — almost always yes for Hermes apps.

## Code patterns

`android/app/build.gradle` — the entire change (book pp. 175–176):

```gradle
android {
    androidResources {
        noCompress += ["bundle"]
    }
}
```

Diff form:

```diff
 android {
+    androidResources {
+        noCompress += ["bundle"]
+    }
 }
```

Verify uncompressed bundle in the APK:

```
unzip -l android/app/build/outputs/apk/release/app-release.apk | grep index.android.bundle
# the "size" and "compressed size" columns should match for an uncompressed file
```

## Verification
- `unzip -l` shows `index.android.bundle` with matching size / compressed size.
- Ruler before/after: install size up ~6–8%; download size unchanged.
- TTI before/after on a **real low-end Android device** (not an emulator): startup down by ≥100 ms; book reports 450 ms on a large app.
- The Hermes mmap path being active is implicit — there's no direct signal beyond the TTI improvement.

## Edge cases & gotchas
- **iOS has no equivalent.** Different packaging model — no compression to disable. This is Android-only.
- **JSC apps see no benefit.** JSC parses JS text and gains nothing from uncompressed packaging. The win is Hermes' mmap fast-path.
- **Install-size budget**: apps near the **Google Play 200 MB single-binary cap** or regulated app-size limits can be pushed over by the +6–8% growth. Measure first.
- **OTA updates** (CodePush, EAS Update) ship the bundle separately and typically keep it uncompressed at install-time — verify your update tool doesn't undo this.
- **Complementary to R8**: this is a runtime-startup win; [[rn-perf-r8-android-shrink]] is an install-size win. Apply both.
- **RN ≥ 0.79**: the core team made this default. After upgrading, you can remove the explicit `noCompress` block without behaviour change. Verify by checking the generated `build.gradle`.
- **Other `.bundle` files** (e.g., `feature.chunk.bundle` from Re.Pack code-splitting — see [[rn-perf-remote-code-loading]]) are already covered by the `["bundle"]` extension match.
- **No effect on debug builds** — they load from Metro dev server, not from a prepackaged bundle.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Disable JS Bundle Compression", pp. 175–176
- Marc Rousavy's investigation and RN core PR proposing this as default

## Related skills
- [[rn-perf-measure-tti]] — primary metric this skill targets
- [[rn-perf-analyze-app-bundle]] — quantify the install-size trade-off (Ruler)
- [[rn-perf-r8-android-shrink]] — complementary Android shrink with the opposite trade-off
- [[rn-perf-native-assets-folder]] — sibling Android install-size topic
- [[rn-perf-remote-code-loading]] — Re.Pack chunk files also benefit from `noCompress`
