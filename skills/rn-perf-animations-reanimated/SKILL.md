---
name: rn-perf-animations-reanimated
description: Use whenever a React Native animation drops frames, freezes when JS is busy, or the user mentions `react-native-reanimated`, `react-native-worklets`, worklets, `useAnimatedStyle`, `useSharedValue`, Reanimated CSS animations/transitions, `transitionProperty`, `runOnUI`, `runOnJS`, `scheduleOnUI`, `scheduleOnRN`, `withTiming`/`withSpring`, `InteractionManager`, `runAfterInteractions`, `createInteractionHandle`, or "the animation stutters when I update state" — even if they don't explicitly say "move to the UI thread". Moves JS-driven animations onto the UI thread via Reanimated/worklets or Reanimated 4's CSS-compatible API, and defers non-critical JS work with `InteractionManager`.
---

# High-Performance Animations with Reanimated

## When to use
An animation visibly drops frames while the JS thread is busy (state updates, fetches, list re-renders), or Perf Monitor shows JS FPS dipping during the animation while UI FPS stays steady. That divergence is the signal the animation needs to run on the UI thread.

## What this skill does (single responsibility)
Moves animations off the JS thread using Reanimated. For state-driven animations on Reanimated v4, prefer the CSS-compatible animation/transition API when it fits; for gesture-driven, scroll-driven, or orchestrated animations, use worklets (`useSharedValue`, `useAnimatedStyle`, `runOnUI`/`runOnJS` on Reanimated v3, `scheduleOnUI`/`scheduleOnRN` on Reanimated v4 + `react-native-worklets`). Also defers heavy non-animation JS past interactions with `InteractionManager.runAfterInteractions`. Out of scope: gesture handling (Reanimated pairs with `react-native-gesture-handler`), navigation transitions (a React Navigation concern), and the broader threading model ([[rn-perf-threading-model]]). For React-side deferral as an alternative to `InteractionManager`, see [[rn-perf-concurrent-react]]'s `startTransition`.

## Workflow
1. **Diagnose with Perf Monitor.** If JS thread FPS drops during the animation while UI thread FPS holds, the animation is driven from JS and JS is the bottleneck — move it to UI. See [[rn-perf-measure-js-fps]].
2. **Check Reanimated major version before writing setup code.**
   - Reanimated v3: install `react-native-reanimated` and keep `react-native-reanimated/plugin` last in `babel.config.js`.
   - Reanimated v4: install `react-native-reanimated` plus `react-native-worklets`, use `react-native-worklets/plugin` last in `babel.config.js`, and confirm the app is on the New Architecture.
3. **Install or configure the matching packages** if not present:
   ```
   npm install react-native-reanimated
   ```
   For Reanimated v4:
   ```
   npm install react-native-reanimated react-native-worklets
   ```
   Plugin order matters — the Reanimated or Worklets Babel plugin must be last.
4. **Pick the Reanimated API by animation type.**
   - State-driven style changes on Reanimated v4: start with CSS-compatible transitions/animations (`transitionProperty`, `transitionDuration`, etc.).
   - Gestures, scroll-driven animations, screen transitions, and multi-step orchestration: use worklets and shared values.
   - Reanimated v3 or non-v4 apps: use worklets and shared values.
5. **Refactor `Animated` API to Reanimated.** Replace `Animated.Value` with `useSharedValue` or, for Reanimated v4 state-driven style changes, use CSS-compatible transition props. Replace style interpolations / `Animated.View style={…}` with `useAnimatedStyle(() => ({ … }))` when using worklets. Drive value changes with `withTiming`, `withSpring`, etc.
6. **Use the version-correct imperative API** for JS -> UI entry points: `runOnUI` on Reanimated v3, `scheduleOnUI` from `react-native-worklets` on v4.
7. **Use the version-correct UI -> JS callback API** at the end of an animation: `runOnJS` on Reanimated v3, `scheduleOnRN` from `react-native-worklets` on v4.
8. **Defer heavy JS that doesn't need to run during the animation:** wrap it in `InteractionManager.runAfterInteractions(…)`.
9. **For navigation-triggered work,** pair `useFocusEffect` with `runAfterInteractions` so heavy effects wait until the screen-change animation completes.
10. **Re-measure with Perf Monitor.** Both JS FPS and UI FPS should stay near refresh rate during the interaction.

## Code patterns

Worklet on the UI thread via `useAnimatedStyle` — the hook's callback runs on the UI thread by default; the Reanimated Babel plugin workletizes it automatically, no directive needed (book p. 71):

```tsx
const style = useAnimatedStyle(() => {
  // Runs on the UI thread
  return { opacity: 0.2 };
});
```

`runOnUI` from JS, `runOnJS` from the UI thread — full round-trip with a completion callback that hops back to JS for analytics or `setState` (book pp. 71–72):

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

Reanimated v4 / `react-native-worklets` scheduling:

```tsx
import { scheduleOnUI, scheduleOnRN } from 'react-native-worklets';
import { useSharedValue, withTiming } from 'react-native-reanimated';

const useStartAnimation = () => {
  const progress = useSharedValue(0);

  const trackAnimationFinished = (value: number) => {
    analytics.track('animation_finished', { value });
  };

  const startOnUI = (targetValue: number) => {
    scheduleOnUI(() => {
      'worklet';
      progress.value = withTiming(targetValue, {}, (finished) => {
        if (finished) {
          scheduleOnRN(trackAnimationFinished, targetValue);
        }
      });
    });
  };

  return { progress, startOnUI };
};
```

Reanimated v4 CSS-compatible transition for state-driven animations:

```tsx
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

export function ExpandCard() {
  const [open, setOpen] = React.useState(false);

  return (
    <Pressable onPress={() => setOpen((value) => !value)}>
      <Animated.View
        style={{
          width: open ? 260 : 160,
          transitionProperty: ['width'],
          transitionDuration: 300,
        }}
      />
    </Pressable>
  );
}
```

Version-aware Babel plugin setup:

```js
// Reanimated v3
module.exports = {
  plugins: ['react-native-reanimated/plugin'],
};

// Reanimated v4
module.exports = {
  plugins: ['react-native-worklets/plugin'],
};
```

Defer non-critical work past interactions (book p. 72):

```tsx
InteractionManager.runAfterInteractions(() => {
  console.log('Running after interactions');
});
```

Register a custom interaction handle around a manual animation so `runAfterInteractions` callbacks are held until the animation finishes (book p. 74):

```ts
const handle = InteractionManager.createInteractionHandle();
// run animation… (`runAfterInteractions` tasks are queued)
InteractionManager.clearInteractionHandle(handle);
// queued tasks run once all handles are cleared
```

Pair with React Navigation's `useFocusEffect` to defer expensive screen work past the transition (book p. 74):

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
- **Callbacks passed directly to Reanimated APIs (`useAnimatedStyle`, `runOnUI`, `withTiming`) are workletized automatically** by the Babel plugin. Separate functions called from inside a worklet must either start with `'worklet'` or be Reanimated APIs themselves. Calling a regular JS function inside a worklet without `runOnJS` silently misbehaves.
- **Don't read React state inside a worklet.** Worklets see a snapshot of captured values and can't subscribe to React state. Use `useSharedValue` as the bridge.
- **`measure` and `scrollTo` only work on the UI thread** — wrap calls in `runOnUI` (v3) or `scheduleOnUI` (v4).
- **Active touches block `runAfterInteractions`** (book p. 74): "The touch handling system considers one or more active touches to be an 'interaction' and will delay `runAfterInteractions()` callbacks until all touches have ended or been canceled." Don't expect tasks to run while a finger is down.
- **The Reanimated/Worklets Babel plugin must be the *last* plugin** in `babel.config.js`. Wrong order silently breaks worklet compilation.
- **Reanimated v4 requires New Architecture.** Do not suggest a v4 migration to a Legacy Architecture app without also planning the architecture upgrade.
- **Use Reanimated v4 CSS transitions for the right job.** The 2026 book recommends them for state-driven animations because they are simpler and easier for Reanimated to optimize. Keep worklets/shared values for gestures, scroll-driven animations, screen transitions, or complex orchestration.
- **Bottom-sheet compatibility is version-sensitive.** `@gorhom/bottom-sheet` v5 targets Reanimated v3. If an app uses Reanimated v4, validate sheet gestures and keyboard behavior on device before calling it fixed.
- **React Navigation runs its transitions on the UI thread already.** Heavy `useFocusEffect` code is what stalls them, not the transition itself.
- **Worklet runtimes are separate JS contexts.** Most modules from your main bundle aren't available — only what's been explicitly bridged. `console.log` is patched, `setTimeout` exists, but don't expect arbitrary npm packages to work inside a worklet.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2026), chapter "High-Performance Animations Without Dropping Frames", pp. 70–76
- React Native Reanimated docs — https://docs.swmansion.com/react-native-reanimated/
- React Native Worklets docs — https://docs.swmansion.com/react-native-worklets/

## Related skills
- [[rn-perf-threading-model]] — deeper background on UI vs JS vs native-modules threads.
- [[rn-perf-measure-js-fps]] — confirm the two FPS values; the divergence (JS drops, UI holds) signals a worklet refactor will help.
- [[rn-perf-concurrent-react]] — `startTransition` is the React-side alternative to `InteractionManager.runAfterInteractions` (book p. 74).
- [[rn-perf-profile-native]] — for UI-thread bottlenecks the JS-side migration won't fix.
- [[rn-perf-flashlight-android]] — quantify the FPS improvement.
- [[rn-perf-bottom-sheet]] — bottom-sheet gesture state and version compatibility.
