---
name: rn-perf-view-flattening
description: Use when the user is debugging a "missing view in native tree", an "unexpected children count" in a custom native component, or has too many native views from nested layout-only wrappers in a React Native app — covers view flattening, the `collapsable={false}` opt-out, and verification via Xcode Debug View Hierarchy / Android Studio Layout Inspector. Trigger whenever the user mentions view flattening, collapsable, RCTViewComponentView, ReactViewGroup, deep view hierarchy, or asks why a JSX wrapper isn't showing up in the native tree.
---

# React Native View Flattening

## When to use
A custom native component is receiving more (or fewer) children than its JSX suggests, a wrapper `<View>` doesn't appear in the native view hierarchy, or you want to reduce native view count from deeply-nested layout-only `<View>`s.

## What this skill does (single responsibility)
Recognises when RN's view flattening optimisation is collapsing layout-only wrappers, and uses `collapsable={false}` per-element to opt out where a stable native handle is required. Includes verification via the platform view debuggers. Does **not** cover Yoga internals or layout thread cost (see [[rn-perf-threading-model]]), nor general layout perf.

## What gets flattened
The renderer identifies **layout-only nodes** — views that only affect positioning of their children (no background, no border, no event handler, no transform, opacity = 1, no ref-based imperative call, etc.) — and collapses them into their parent. The result is a shallower native tree, less mounting work, less memory.

View flattening was first introduced on Android. With the New Architecture and the cross-platform C++ renderer, it now applies to **iOS too**.

## The unexpected-children-count gotcha
A custom native component author assumes "I asked for 3 children, I will receive 3":

```tsx
<MyNativeComponent>
    <Child1/>
    <Child2/>
    <Child3/>
</MyNativeComponent>
```

If `<Child1/>` is itself a layout-only wrapper around three views, flattening replaces it:

```tsx
// Effectively passed to the native side:
<MyNativeComponent>
    /* Child1 unexpectedly flattened to 3 Views */
    <View/>
    <View/>
    <View/>
    <Child2/>
    <Child3/>
</MyNativeComponent>
```

The native component now receives **5 children**, not 3. Any indexed logic breaks.

## The opt-out: `collapsable={false}`

```tsx
<MyNativeComponent>
    <Child1 collapsable={false} />
    <Child2 collapsable={false} />
    <Child3 collapsable={false} />
</MyNativeComponent>
```

Exactly 3 children reach the native side. Must be set on **each child individually** — setting it on the parent does not propagate.

## JSX → native class mapping

**iOS (Xcode Debug View Hierarchy):**

```
RCTViewComponentView         <- <View/>
RCTParagraphTextView         <- <Text/>
RCTImageComponentView        <- <Image/>
RCTSafeAreaViewComponentView <- <SafeAreaView/>
RCTScrollViewComponentView   <- <ScrollView/> / <FlatList/> outer
```

**Android (Android Studio Layout Inspector):**

```
ReactViewGroup    <- <View/>
ReactTextView     <- <Text/>
ReactImageView    <- <Image/>
ReactScrollView   <- <ScrollView/>
```

## Workflow
1. **Trust the default.** Don't sprinkle `collapsable={false}` pre-emptively — it defeats the optimisation.
2. **When authoring a native component that depends on children count/order**, either make the native side defensive (handle any count) or document that consumers must mark children `collapsable={false}` and add a runtime check.
3. **When debugging "missing view" / "extra view" symptoms**, open the platform view debugger:
   - iOS: run under Xcode, click the *Debug View Hierarchy* button in the bottom debug toolbar (looks like layered rectangles) — get a 3D-rotatable tree.
   - Android: View → Tool Windows → Layout Inspector.
4. **If a wrapper is missing in the native tree** but present in JSX, flattening is working as designed. If the child *needs* to be a discrete native view (native styling, hit-testing, scroll snapping, animated ref), set `collapsable={false}`.
5. **Check library docs** — `react-native-screens`, `react-native-bottom-tabs`, parts of `react-native-gesture-handler`, and `react-native-reanimated` configurations may explicitly require `collapsable={false}` on children.

## Verification
- **Depth check** — open Layout Inspector / Debug View Hierarchy before and after a refactor; confirm depth dropped (or, for the opt-out fix, that the expected wrapper now appears).
- **Children-count assertion** — when relying on `collapsable={false}`, add a native-side count check or `React.Children.count(props.children)` on the JS side and log mismatches.
- **Verify on both platforms** — flattening rules have small per-platform differences.
- **Perf delta** — for lists with deeply-nested item layouts, re-record JS FPS / native CPU before and after toggling.

## Edge cases & gotchas
- A view becomes **automatically non-flattenable** when it has any of: background color, border, event handler, transform, opacity ≠ 1, certain layout props, or is the target of a ref-based imperative call. Most user-styled `<View>`s are already non-flattenable.
- `testID` may or may not block flattening depending on RN version — don't rely on it.
- `react-native-reanimated` sometimes needs `collapsable={false}` on the animated child to keep a stable native handle. Check Reanimated docs.
- `react-native-gesture-handler` docs call out `collapsable={false}` requirements for certain configurations.
- "Greedy flattening" produces a *shorter* tree than expected — opposite of "missing view". Be ready for either symptom.
- Pre-New-Architecture iOS did not have flattening; behaviour is now consistent across platforms via the C++ renderer.
- Setting `collapsable={false}` on the parent does **not** propagate to children — set on each child explicitly.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Use View Flattening", pp. 119–122
- React Native docs: https://reactnative.dev/architecture/view-flattening

## Related skills
- [[rn-perf-threading-model]] — Yoga (which calculates the flattened/unflattened layout) runs on the JS thread
- [[rn-perf-platform-differences]] — view debuggers differ per IDE
- [[rn-perf-profile-native]] — verify mounting cost reduction via Time Profiler / AS Profiler
- [[rn-perf-rn-sdks-over-web]] — native components from `react-native-screens` / `react-native-bottom-tabs` interact with flattening
- [[rn-perf-native-modules-faster]] — when authoring a Fabric view that takes children, plan for flattening
