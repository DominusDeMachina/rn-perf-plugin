---
name: rn-perf-virtualized-lists
description: Use when a React Native list scrolls slowly, mounts slowly with many items, shows blank cells during scroll, or the user mentions FlatList, FlashList, VirtualizedList, Legend List, ScrollView with mapped children, getItemLayout, or estimatedItemSize. Trigger whenever the user asks "why is my list slow?", is choosing between list libraries, or has a ScrollView rendering > 20 items — even without explicit mention of virtualization.
---

# Pick and Configure Virtualized Lists (FlatList / FlashList / Legend List)

## When to use
A list scrolls below 58 fps, blanks during fast scroll, takes hundreds of milliseconds to mount with many items, or is currently a `ScrollView` rendering mapped children. Also triggers when the user asks which list library to use.

## What this skill does (single responsibility)
Selects and configures the right virtualized list — `FlatList`, `FlashList`, `@legendapp/list`, or raw `VirtualizedList` — for a given dataset, item shape, and platform target. Out of scope: scroll-driven animations ([[rn-perf-animations-reanimated]]), per-row atomic state ([[rn-perf-atomic-state-management]]), and row memoization ([[rn-perf-react-compiler]]). This skill picks the container and configures it; siblings tune what's inside the row.

## Workflow
1. **Confirm a list problem.** Open Perf Monitor (see [[rn-perf-measure-js-fps]]); watch JS FPS during mount and scroll. If FPS dips, proceed.
2. **Audit current code.** Look for `<ScrollView>` with mapped children, or `FlatList` without `keyExtractor` / `getItemLayout`.
3. **Decision tree:**
   - `ScrollView` + mapped children + > ~20 items → migrate to **`FlatList`**.
   - `FlatList` with **fixed-height rows** → add `getItemLayout` (skips measurement).
   - `FlatList` with complex rows, variable heights, blanks while scrolling, or > 500 items → migrate to **`FlashList`** with `estimatedItemSize`.
   - On the New Architecture with appetite for a beta → evaluate **`@legendapp/list`** behind a feature flag.
   - Highly custom layouts (masonry, sticky-grid hybrids) where none of the above fit → drop down to **`VirtualizedList`**.
4. **Configure required props.** Always set `data`, `renderItem`, `keyExtractor`. For fixed heights, add `getItemLayout`. For `FlashList`, supply `estimatedItemSize` (average row height — e.g., 50/100/150 → 100).
5. **Keep rows light.** Memoize the row component; never put side effects in the render path; avoid inline objects in `renderItem`. The book is explicit: "It's crucial to keep list items as light as possible, without any side effects" (p. 39–40).
6. **Measure again** on the same device/scenario; persist before/after Flashlight (Android) or Perf Monitor numbers in the PR.

## Code patterns

`ScrollView` → `FlatList` (book pp. 35–36):

```tsx
import { View, Text, FlatList } from 'react-native';

const renderItem = ({ item }) => (
  <View><Text>{item}</Text></View>
);

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item, index) => index.toString()}
/>
```

Add `getItemLayout` for fixed-height rows (book p. 38):

```tsx
const ITEM_HEIGHT = 50;

const getItemLayout = (_, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item, index) => index.toString()}
  getItemLayout={getItemLayout}
/>
```

`FlatList` → `FlashList` (book p. 39):

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={ITEM_HEIGHT}
/>
```

## Verification
- **FPS:** scroll end-to-end on a **low-end Android** device with Perf Monitor open. Target sustained ≥ 58 fps JS.
- **Flashlight score:** record before/after; the book's example moved a real list from **25/100 → 78/100** swapping `FlatList` for `FlashList` (p. 40).
- **CPU:** "Average CPU usage" and "High CPU usage" in Flashlight should drop (book example: 226.8% / 19.1 s → 127.1% / 1.7 s).
- **No blank cells** during fast scroll. If blanks appear, raise `estimatedItemSize` or lighten the row.

## Edge cases & gotchas
- **`FlashList` warns without `estimatedItemSize`.** Don't ship without it — the developer-chosen value beats the runtime estimate (book p. 40).
- **Item recycling means render-path side effects leak across rows.** With `FlashList`, the same component instance gets new `data`. Never start animations or set up subscriptions in render; always `useEffect` keyed off `item.id`.
- **`FlatList` keeps unmounted items in its window buffer.** Uses more memory than `FlashList` and "eventually slows the list down" (book p. 39).
- **`getItemLayout` lies for variable-height rows.** Scrollbar position and `scrollToIndex` will land at the wrong offset. Compute conservatively or omit it.
- **Legend List is 1.0-beta.** Use only with a fallback path; gate behind a feature flag in prod.
- **Always measure with the engine you ship** (Hermes vs JSC) and on a low-end Android. Emulator and high-end iPhone hide the bottleneck.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), "Higher-Order Specialized Components", pp. 34–41.
- FlashList: https://shopify.github.io/flash-list/
- Legend List: https://legendapp.com/open-source/list/

## Related skills
- [[rn-perf-measure-js-fps]] — confirm the FPS problem before swapping libraries.
- [[rn-perf-profile-js-react]] — inspect per-item render cost to find what's keeping rows heavy.
- [[rn-perf-react-compiler]] — auto-memoize row components.
- [[rn-perf-atomic-state-management]] — per-row state without re-rendering the whole list.
- [[rn-perf-concurrent-react]] — `useDeferredValue` for filter inputs feeding the list.
- [[rn-perf-flashlight-android]] — quantify the improvement in CI.
