---
name: rn-perf-perceived-performance
description: Use when a React Native app feels slow despite justified measured latency — spinners everywhere, blank screens while data loads, taps with no feedback, layout jumping when content arrives, skeleton screens, shimmer placeholders, optimistic updates with TanStack Query `onMutate`, blurhash/thumbhash image placeholders, `android_ripple` pressed states, splash screen fade with react-native-bootsplash or expo-splash-screen, or Suspense fallback layout shift. Applies perceived-performance techniques (skeletons, optimistic UI, instant touch feedback, continuity transitions) on top of, never instead of, measured optimization.
---

# Perceived Performance

## When to use
The user has already measured (or you have verified) that remaining latency is justified — network round-trips, cold start work that cannot be deferred further — and the app still *feels* slow: blank screens, generic spinners, unacknowledged taps, content popping in and shifting layout, or a jarring splash-to-app handoff.

## What this skill does (single responsibility)
Makes waiting feel shorter and interactions feel instant: skeletons, optimistic updates, touch feedback, masking transitions, splash continuity, and layout-shift prevention. Hard guardrail: this skill complements, never replaces, measured optimization — if latency itself has not been audited, run [[rn-perf-full-app-test]] first and fix real bottlenecks before polishing perception. Out of scope: actually reducing network/data latency ([[rn-perf-network-data-layer]]), startup work scheduling ([[rn-perf-startup-deferred-init]]), and image pipeline tuning ([[rn-perf-images]]).

## Workflow
1. **Confirm the latency is justified.** Measure the interaction first (TTI via [[rn-perf-measure-tti]], screen-level timings via [[rn-perf-full-app-test]]) on a release build on a real device. If a request takes 3 s because of a fixable backend or bundle problem, fix that — a skeleton over a self-inflicted delay is lipstick.
2. **Check installed versions.** Read `package.json` for `@tanstack/react-query` (v4 vs v5 changes the `onMutate` typing and `useMutation` signature), `react-native-bootsplash` or `expo-splash-screen`, `expo-image`, and `react` (Suspense for data needs React 18+). Treat any new package (e.g. a shimmer library) as a supply-chain change — prefer building skeletons from `View`s and existing animation deps before adding one.
3. **Acknowledge every tap within 100 ms.** Audit Pressables for missing pressed states; add `android_ripple` / opacity feedback. Navigation taps should start the transition immediately even if the destination shows a skeleton.
4. **Replace blank screens and long spinners with skeletons** that mirror the final layout. Keep a spinner only for short, unpredictable, or full-screen-blocking waits (e.g. payment submission) where layout mimicry adds nothing.
5. **Make mutations optimistic** where the success rate is high and rollback is cheap (likes, toggles, reorder). Always implement rollback.
6. **Smooth the seams.** Splash-screen fade into the first screen, transition animations that mask fetch time, blurhash/thumbhash image placeholders ([[rn-perf-images]]), Suspense fallbacks shaped like the final content.
7. **Reserve space for incoming content** with fixed dimensions or `aspectRatio` so data arrival never shifts layout.
8. **Re-measure and review.** Same device/build/interaction: TTI and FPS must not regress (skeleton animations cost frames), and a screen recording should show no blank frames, no layout shift, and no skeleton flashes.

## Code patterns

Instant touch feedback — never leave a tap unacknowledged:

```tsx
<Pressable
  onPress={onOpen}
  android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
  style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
>
  <CardContent />
</Pressable>
```

Skeleton with a delay threshold — never flash a skeleton for <200 ms:

```tsx
function useDelayedPending(isPending: boolean, delay = 200) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isPending) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [isPending, delay]);
  return show;
}

const showSkeleton = useDelayedPending(query.isPending);
if (showSkeleton) return <FeedSkeleton />;   // mirrors final card layout
if (query.isPending) return null;            // sub-200ms: render nothing, avoid flash
```

Optimistic update with rollback (TanStack Query v5):

```tsx
const likeMutation = useMutation({
  mutationFn: (postId: string) => api.like(postId),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    const previous = queryClient.getQueryData(['post', postId]);
    queryClient.setQueryData(['post', postId], (old: Post) => ({
      ...old, liked: true, likeCount: old.likeCount + 1,
    }));
    return { previous };
  },
  onError: (_err, postId, ctx) => {
    queryClient.setQueryData(['post', postId], ctx?.previous); // rollback
  },
  onSettled: (_data, _err, postId) => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  },
});
```

Splash-to-first-screen continuity (react-native-bootsplash v5/v6):

```tsx
import BootSplash from 'react-native-bootsplash';

useEffect(() => {
  prepareInitialData().finally(() => BootSplash.hide({ fade: true }));
}, []);
// expo-splash-screen equivalent: SplashScreen.preventAutoHideAsync() at module
// scope, then SplashScreen.hideAsync() once the first real frame is ready.
```

Suspense fallback aligned with the final layout (React 18+):

```tsx
<Suspense fallback={<ProfileSkeleton />}>  {/* same heights/positions as <Profile /> */}
  <Profile userId={id} />
</Suspense>
```

Reserve space so arriving data never shifts layout:

```tsx
<View style={{ height: BANNER_HEIGHT }}>      {/* fixed slot, empty until loaded */}
  {banner && <Banner data={banner} />}
</View>
<Image source={{ uri }} style={{ width: '100%', aspectRatio: 16 / 9 }}
       placeholder={{ thumbhash }} transition={150} />
```

## Verification
- Screen recording (slow-motion if available) shows pressed-state feedback within ~100 ms of every tap.
- No blank white/empty frames between splash, navigation transitions, and first content.
- Skeleton appears only for waits >200 ms and matches the final layout — content swap causes no visible jump.
- Optimistic mutation: UI updates instantly online; with airplane mode on, the change visibly rolls back and an error surfaces.
- No cumulative layout shift when lists, images, or banners hydrate (fixed dimensions hold their slots).
- TTI and interaction FPS re-measured on the same device/build are unchanged or better — perception work added no real cost.

## Edge cases & gotchas
- **No fake progress bars.** Determinate progress UI must reflect real progress (e.g. upload bytes); fabricated easing-to-90% erodes trust and reads as a hang when it stalls.
- Skeleton flash: a skeleton visible for 50 ms feels *slower* than nothing. Use the delay-threshold hook, and optionally enforce a minimum display time (~300 ms) once shown so it does not blink.
- Optimistic updates without rollback corrupt UI state on failure; without `cancelQueries` in `onMutate`, an in-flight refetch can overwrite the optimistic value.
- Avoid optimism for destructive or low-success operations (payments, deletes with server-side validation) — show real pending state instead.
- Shimmer animations on many skeleton cells can themselves drop frames on low-end Android; drive them with Reanimated on the UI thread and verify FPS.
- `BootSplash.hide({ fade: true })` called before the first screen has rendered real content just moves the blank frame later; hide after initial data/layout is ready.
- Suspense fallbacks that differ in height from the resolved content cause scroll-position jumps inside ScrollViews; match dimensions, not just shapes.
- Do not add `React.memo`/`useMemo` to skeleton or feedback components speculatively; only memoize when a profiler shows re-render cost.

## References
- Nielsen Norman Group, response-time limits (0.1 s / 1 s / 10 s): https://www.nngroup.com/articles/response-times-3-important-limits/
- TanStack Query optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- react-native-bootsplash: https://github.com/zoontek/react-native-bootsplash
- expo-splash-screen: https://docs.expo.dev/versions/latest/sdk/splash-screen/
- React Suspense: https://react.dev/reference/react/Suspense
- web.dev on skeletons and perceived speed: https://web.dev/articles/optimize-cls

## Related skills
- [[rn-perf-full-app-test]] - run the real performance audit before reaching for perception techniques
- [[rn-perf-images]] - blurhash/thumbhash placeholders and progressive image loading
- [[rn-perf-navigation-transitions]] - transition smoothness that this skill's masking relies on
- [[rn-perf-network-data-layer]] - caching and prefetching that shrink the latency being masked
- [[rn-perf-concurrent-react]] - useTransition/useDeferredValue to keep input responsive during renders
- [[rn-perf-measure-tti]] - verify perception work did not regress startup
