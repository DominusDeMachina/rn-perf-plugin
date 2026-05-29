---
name: rn-perf-animations-reanimated
description: Use whenever a React Native animation drops frames, freezes when JS is busy, or the user mentions `react-native-reanimated`, worklets, `useAnimatedStyle`, `useSharedValue`, `runOnUI`, `runOnJS`, `withTiming`/`withSpring`, `InteractionManager`, `runAfterInteractions`, `createInteractionHandle`, or "the animation stutters when I update state" — even if they don't explicitly say "move to the UI thread". Moves JS-driven animations onto the UI thread via Reanimated worklets and defers non-critical JS work with `InteractionManager`.
---

# High-Performance Animations with Reanimated Worklets

## When to use
An animation visibly drops frames while the JS thread is busy (state updates, fetches, list re-renders), or Perf Monitor shows JS FPS dipping during the animation while UI FPS stays steady. That divergence is the signal the animation needs to run on the UI thread.

## What this skill does (single responsibility)
Moves animations off the JS thread using Reanimated worklets (`useSharedValue`, `useAnimatedStyle`, `runOnUI`, `runOnJS`), and defers heavy non-animation JS past interactions with `InteractionManager.runAfterInteractions`. Out of scope: gesture handling (Reanimated pairs with `react-native-gesture-handler`), navigation transitions (a React Navigation concern), and the broader threading model ([[rn-perf-threading-model]]). For React-side deferral as an alternative to `InteractionManager`, see [[rn-perf-concurrent-react]]'s `startTransition`.

## Workflow
1. **Diagnose with Perf Monitor.** If JS thread FPS drops during the animation while UI thread FPS holds, the animation is driven from JS and JS is the bottleneck — move it to UI. See [[rn-perf-measure-js-fps]].
2. **Install Reanimated** if not present:
   ```
   npm install react-native-reanimated
   ```
   Add `react-native-reanimated/plugin` as the **last** plugin in `babel.config.js`. Plugin order matters — getting this wrong is the most common setup error.
3. **Refactor `Animated` API to worklets.** Replace `Animated.Value` with `useSharedValue`; replace style interpolations / `Animated.View style={…}` with `useAnimatedStyle(() => ({ … }))`. Drive value changes with `withTiming`, `withSpring`, etc.
4. **Use `runOnUI` for imperative entry points** from JS — animation triggers in `useEffect`, or calls to UI-thread-only functions like `measure` and `scrollTo`.
5. **Use `runOnJS` to call back into JS** at the end of an animation (analytics, navigation, `setState`).
6. **Defer heavy JS that doesn't need to run during the animation:** wrap it in `InteractionManager.runAfterInteractions(…)`.
7. **For navigation-triggered work,** pair `useFocusEffect` with `runAfterInteractions` so heavy effects wait until the screen-change animation completes.
8. **Re-measure with Perf Monitor.** Both JS FPS and UI FPS should stay near refresh rate during the interaction.

## Code patterns

Worklet on the UI thread via `useAnimatedStyle` — the `'worklet'` directive marks the callback so the Reanimated Babel plugin compiles it for the UI runtime (book p. 60):

```tsx
const style = useAnimatedStyle(() => {
  'worklet';
  // Runs on the UI thread
  return { opacity: 0.2 };
});
```

`runOnUI` from JS, `runOnJS` from the UI thread — full round-trip with a completion callback that hops back to JS for analytics or `setState` (book pp. 60–61):

```tsx
import { runOnUI, runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const progress = useSharedValue(0);
const scale = useSharedValue(1);

const notifyCompletion = () => {
  // Runs on the JS thread — analytics, setState, etc.
  console.log('Animation completed!');
};

const triggerAnimation = (targetValue: number) => {
  progress.value = targetValue;
  scale.value = withTiming(
    targetValue,
    { duration: 400 },
    (finished) => {
      'worklet';
      if (finished) {
        runOnJS(notifyCompletion)();
      }
    }
  );
};

const animatedStyle = useAnimatedStyle(() => ({
  opacity: progress.value,
  transform: [{ scale: scale.value }],
}));
```

Defer non-critical work past interactions (book p. 61):

```tsx
InteractionManager.runAfterInteractions(() => {
  console.log('Running after interactions');
});
```

Register a custom interaction handle around a manual animation so `runAfterInteractions` callbacks are held until the animation finishes (book p. 62):

```ts
const handle = InteractionManager.createInteractionHandle();
// run animation… (`runAfterInteractions` tasks are queued)
InteractionManager.clearInteractionHandle(handle);
// queued tasks run once all handles are cleared
```

Pair with React Navigation's `useFocusEffect` to defer expensive screen work past the transition (book p. 62):

```tsx
useFocusEffect(
  React.useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // Expensive task eventually updating UI
    });
    return () => task.cancel();
  }, [])
);
```

## Verification
- **Both FPS counters stay green** in Perf Monitor on a low-end Android during the animation: UI thread ≥ 58, JS thread ≥ 58.
- **Animation survives a deliberate JS block.** Introduce a synchronous 500 ms loop in a button handler — a worklet-driven animation continues smoothly; a JS-driven one freezes. The worklet version is correct.
- **Flashlight measure pass** (see [[rn-perf-flashlight-android]]) shows higher and more stable FPS during the scenario than the pre-Reanimated baseline.
- **No frame drops in Xcode Instruments' Core Animation instrument** during the animation on iOS.

## Edge cases & gotchas
- **`'worklet'` directive is mandatory** in callbacks executed on the UI thread. Functions called from inside `useAnimatedStyle` or `runOnUI` must either start with `'worklet'` or be Reanimated APIs themselves. Calling a regular JS function inside a worklet without `runOnJS` silently misbehaves.
- **Don't read React state inside a worklet.** Worklets see a snapshot of captured values and can't subscribe to React state. Use `useSharedValue` as the bridge.
- **`measure` and `scrollTo` only work on the UI thread** — wrap calls in `runOnUI` (book p. 60).
- **Active touches block `runAfterInteractions`** (book p. 62): "The touch handling system considers one or more active touches to be an 'interaction' and will delay `runAfterInteractions()` callbacks until all touches have ended or been canceled." Don't expect tasks to run while a finger is down.
- **Reanimated's Babel plugin must be the *last* plugin** in `babel.config.js`. Wrong order silently breaks worklet compilation.
- **React Navigation runs its transitions on the UI thread already.** Heavy `useFocusEffect` code is what stalls them, not the transition itself.
- **Worklet runtimes are separate JS contexts.** Most modules from your main bundle aren't available — only what's been explicitly bridged. `console.log` is patched, `setTimeout` exists, but don't expect arbitrary npm packages to work inside a worklet.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "High-Performance Animations Without Dropping Frames", pp. 59–62
- React Native Reanimated docs — https://docs.swmansion.com/react-native-reanimated/

## Related skills
- [[rn-perf-threading-model]] — deeper background on UI vs JS vs native-modules threads.
- [[rn-perf-measure-js-fps]] — confirm the two FPS values; the divergence (JS drops, UI holds) signals a worklet refactor will help.
- [[rn-perf-concurrent-react]] — `startTransition` is the React-side alternative to `InteractionManager.runAfterInteractions` (book p. 62).
- [[rn-perf-profile-native]] — for UI-thread bottlenecks the JS-side migration won't fix.
- [[rn-perf-flashlight-android]] — quantify the FPS improvement.
