---
name: rn-perf-images
description: Use when a React Native app has slow, flickering, or memory-hungry images — `expo-image`, `react-native-fast-image`, core `Image`, `cachePolicy`, `recyclingKey`, `placeholder`, blurhash, thumbhash, `contentFit`, `resizeMethod`, `prefetch`, OOM crashes from large photos, blurry/late images in FlatList or FlashList, giant animated GIFs, or oversized CDN downloads. Picks the right image component and props, sizes images server-side, and verifies wins with memory and scroll-FPS measurements.
---

# Image Performance

## When to use
The user reports slow-loading or flickering images, out-of-memory crashes when scrolling photo-heavy lists, janky scroll FPS in feeds with images, large downloads on cellular, choppy animated GIFs, or asks which image library to use (`expo-image` vs `react-native-fast-image` vs core `Image`).

## What this skill does (single responsibility)
Optimizes how remote and local images are fetched, decoded, cached, and rendered: library choice, caching/recycling props, server-side resizing, modern formats, and GIF replacement. Out of scope: list virtualization itself ([[rn-perf-virtualized-lists]]), diagnosing native heap leaks beyond image bitmaps ([[rn-perf-hunt-native-memory-leaks]]), bundled-asset packaging ([[rn-perf-native-assets-folder]]), and placeholder/skeleton UX strategy ([[rn-perf-perceived-performance]]).

## Workflow
1. **Measure a baseline first.** On a release build on a real (ideally low-end Android) device, capture native memory while scrolling the image-heavy screen ([[rn-perf-hunt-native-memory-leaks]] tooling: Xcode Instruments Allocations / Android Studio Memory Profiler) and scroll FPS ([[rn-perf-measure-js-fps]]). Note device, build type, and the exact interaction so the after-measurement is comparable.
2. **Check installed versions.** Read `package.json` for `expo-image`, `react-native-fast-image`, `expo`, and `react-native` versions before giving API-specific advice. `react-native-fast-image` is barely maintained (no release activity for years) and has known New Architecture caveats — verify it actually works on the app's RN version before recommending it; prefer `expo-image` for new work. Adding either library is a supply-chain change: review maintenance status and transitive deps before installing.
3. **Audit what is actually downloaded and decoded.** Log or proxy image URLs and compare intrinsic pixel size to the rendered size. Decoded bitmap cost is `width × height × 4` bytes — a 4000×3000 photo decodes to ~48 MB of RAM regardless of whether the JPEG file was 800 KB. Several of those alive in a list is an OOM on a 2 GB device.
4. **Fix sizing at the source.** Request appropriately sized images from the server/CDN (e.g. `?w=400&h=400&fm=webp` style resize params, or pick from a size variant list based on `PixelRatio.getPixelSizeForLayoutSize`). Downscaling on device after downloading and decoding the full image wastes bandwidth, CPU, and memory.
5. **Use the right component and props.** Default to `expo-image` with `cachePolicy`, `recyclingKey` (in lists), `placeholder` (blurhash/thumbhash), `transition`, `contentFit`, and `priority`. On core `Image` on Android, set `resizeMethod="resize"` for large sources rendered small.
6. **Replace heavy GIFs.** Large animated GIFs decode every frame as a full bitmap. Replace with a muted looping MP4 (`expo-video` / `react-native-video`) or Lottie for vector animations.
7. **Re-measure** the same device/build/interaction and compare memory high-water mark and scroll FPS against the baseline.

## Code patterns

`expo-image` defaults for a remote image (expo-image 1.x/2.x):

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: `${CDN}/photos/${id}?w=800&fm=webp` }}
  style={{ width: 400, height: 300 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={200}
  placeholder={{ thumbhash: item.thumbhash }} // or { blurhash: item.blurhash }
  priority="normal"
/>
```

Images inside a virtualized list — recycle and keep dimensions stable:

```tsx
const renderItem = ({ item }: { item: Photo }) => (
  <Image
    source={{ uri: item.thumbUrl }}        // pre-sized thumbnail, not the original
    recyclingKey={item.id}                  // resets state when the view is reused
    style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }} // fixed: no layout thrash
    contentFit="cover"
    cachePolicy="memory-disk"
    placeholder={{ blurhash: item.blurhash }}
    transition={100}
  />
);
```

Prefetch above-the-fold or next-screen images:

```tsx
import { Image } from 'expo-image';

await Image.prefetch(urls, { cachePolicy: 'memory-disk' });
```

Request the size you render (CDN resize params instead of on-device downscale):

```tsx
import { PixelRatio } from 'react-native';

const px = PixelRatio.getPixelSizeForLayoutSize(200); // layout 200pt -> physical px
const uri = `${CDN}/photos/${id}?w=${px}&fit=cover&fm=webp`;
```

Core `Image` on Android — decode at target size:

```tsx
import { Image } from 'react-native';

<Image
  source={{ uri }}
  style={{ width: 120, height: 120 }}
  resizeMode="cover"
  resizeMethod="resize" // Android: downsample during decode instead of decoding full-res
/>
```

`react-native-fast-image` (legacy apps only — confirm it builds on the app's RN/arch first):

```tsx
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
  style={{ width: 400, height: 300 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

Replace a large GIF with looping video (expo-video):

```tsx
import { useVideoPlayer, VideoView } from 'expo-video';

const player = useVideoPlayer(mp4Url, (p) => { p.loop = true; p.muted = true; p.play(); });
<VideoView player={player} style={{ width: 320, height: 240 }} contentFit="cover" nativeControls={false} />
```

## Verification
- Native memory high-water mark while scrolling the image screen drops versus baseline (same device, release build, same scroll path) and stays flat across repeated scrolls.
- Scroll FPS on the image-heavy list reaches the device refresh rate, measured before and after.
- Network inspector shows image responses near the rendered pixel size (e.g. ~50–150 KB WebP thumbnails instead of multi-MB originals).
- No image flicker or stale images when list cells are recycled (`recyclingKey` set, fixed dimensions).
- Placeholders (blurhash/thumbhash) appear instantly and crossfade via `transition`; no white flash.
- GIF-replacement screens no longer show multi-frame bitmap spikes in the memory profiler.

## Edge cases & gotchas
- File size is not memory cost: a 200 KB highly compressed 4000×3000 JPEG still decodes to ~48 MB. Always reason in pixels, not bytes.
- `recyclingKey` without stable `style` dimensions still causes layout thrash; reserve exact width/height (or `aspectRatio`) per cell.
- `expo-image` `cachePolicy` default is `"disk"`; lists usually want `"memory-disk"`. `"none"` re-downloads every mount.
- Cache keys are URL-based: signed URLs that change query params on every fetch defeat caching — use a stable URL or strip signatures into headers.
- AVIF beats WebP on size but decode is slower on older Android; ship WebP as the floor, AVIF only with content negotiation. iOS supports WebP since iOS 14 natively and via expo-image's SDWebImage everywhere.
- Android `resizeMethod="resize"` only helps when the source is meaningfully larger than the target; `"scale"` is faster for upscaling.
- `react-native-fast-image` may fail to compile or misbehave on New Architecture/Fabric; check its issue tracker against the app's RN version before any recommendation, and plan migration to `expo-image`.
- Local bundled images: huge PNGs inflate the app download too — audit with [[rn-perf-analyze-app-bundle]] and convert to WebP or move to on-demand delivery.
- Do not wrap list image components in speculative `React.memo`/`useMemo`; fix decode size and recycling first, and only memoize if the React profiler shows the image row re-rendering as a measured problem.

## References
- expo-image docs: https://docs.expo.dev/versions/latest/sdk/image/
- React Native Image docs (resizeMethod/resizeMode): https://reactnative.dev/docs/image
- Thumbhash: https://evanw.github.io/thumbhash/
- Blurhash: https://blurha.sh/
- react-native-fast-image: https://github.com/DylanVann/react-native-fast-image
- Android large-bitmap guidance: https://developer.android.com/topic/performance/graphics/load-bitmap

## Related skills
- [[rn-perf-virtualized-lists]] - the list around the images: windowing, cell recycling, estimated sizes
- [[rn-perf-hunt-native-memory-leaks]] - profiling bitmap memory and finding retained decoded images
- [[rn-perf-native-assets-folder]] - shipping local images as native assets
- [[rn-perf-measure-js-fps]] - measuring scroll FPS before/after image fixes
- [[rn-perf-analyze-app-bundle]] - finding oversized bundled image assets
- [[rn-perf-perceived-performance]] - placeholder and progressive-loading UX while images load
