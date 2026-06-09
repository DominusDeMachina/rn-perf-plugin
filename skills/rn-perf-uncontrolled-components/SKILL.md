---
name: rn-perf-uncontrolled-components
description: Use when a TextInput feels laggy while typing in a React Native app, characters appear behind keystrokes, or the user is converting controlled forms to uncontrolled / ref-driven. Trigger whenever the user mentions input lag, slow TextInput, per-keystroke re-renders, React Hook Form, useRef on inputs, defaultValue, or asks "why is typing slow?" — even without an explicit ask to switch to uncontrolled.
---

# Uncontrolled Inputs to Eliminate Per-Keystroke Re-Renders

## When to use
A `TextInput` lags behind the user's typing on a low-end device, the parent screen re-renders on every keystroke, or the user is migrating a form to refs / `defaultValue` / React Hook Form's `register()`.

## What this skill does (single responsibility)
Converts controlled `TextInput`s (value in React state) to **uncontrolled** inputs (value in a ref or native view), eliminating the re-render storm caused by `setState` on every keystroke. Out of scope: form validation patterns, list virtualization ([[rn-perf-virtualized-lists]]), and general atomic state ([[rn-perf-atomic-state-management]]). For the rare legitimate controlled case (live search), this skill points at `useDeferredValue` in [[rn-perf-concurrent-react]] but doesn't fix concurrent-mode issues itself.

## Workflow
1. **Identify candidates.** Any `<TextInput value={x} onChangeText={setX}>` where `x` is React state.
2. **Decide if the value is actually consumed per keystroke.**
   - **No** (login, settings, signup, profile edit, anything read on submit) → make it uncontrolled.
   - **Yes, live search** → keep controlled but **debounce** the consumer (150–300 ms) and use `useDeferredValue` (see [[rn-perf-concurrent-react]]).
3. **Apply the conversion pattern.** The book's fix is removing the `value` prop from `TextInput` so data flows one way, from the native input to JS; keeping the value in a ref (never in state) additionally eliminates the re-renders — see snippets below.
4. **Profile.** Record while typing 10 characters with React Profiler. Parent commit count should drop from 10 to 0.

## Code patterns

Controlled — the anti-pattern. Every keystroke re-renders this component and every ancestor depending on `name`:

```tsx
const [name, setName] = useState('');
return <TextInput value={name} onChangeText={setName} />;
```

Uncontrolled — the book's fix is dropping the `value` prop; storing the value in a ref instead of state also removes the per-keystroke re-renders:

```tsx
const valueRef = useRef('');

return (
  <TextInput
    onChangeText={(text) => { valueRef.current = text; }}
    defaultValue=""
  />
);

// Read valueRef.current when you actually need the value (submit, validation event).
```

Uncontrolled, native-ref pattern:

```tsx
const inputRef = useRef<TextInput>(null);
const valueRef = useRef('');

const handleSubmit = () => {
  submit(valueRef.current);
  inputRef.current?.clear(); // imperative control via the native ref
};

return (
  <TextInput
    ref={inputRef}
    defaultValue=""
    onChangeText={(text) => { valueRef.current = text; }}
  />
);
```

Controlled-with-debounce when live search is genuinely required:

```tsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);
return <TextInput value={query} onChangeText={setQuery} />;
// Pass deferredQuery to the list, not query.
```

## Verification
- **React Profiler:** record while typing 10 characters. Pre-fix shows 10 commits at the input's parent. Post-fix shows **0** (or only commits caused by unrelated state).
- **JS FPS** during sustained typing on a low-end Android device: pre-fix dips to ~30; post-fix stays at 60.
- **User-observable:** characters appear instantaneously with no perceptible lag.

## Edge cases & gotchas
- **New Architecture note:** the classic controlled-input de-sync/flicker (characters jumping behind keystrokes) was largely an old async-bridge artifact; Fabric's synchronous layout and event handling (default since RN 0.76) mostly eliminates it. On the New Architecture, convert to uncontrolled mainly to cut per-keystroke re-render cost on heavy screens — not to fix flicker.
- **`defaultValue` only seeds the input once.** To programmatically change the value later, do so imperatively: `ref.current?.setNativeProps({ text: '…' })`. Re-rendering with a new `defaultValue` will not update the input.
- For inputs that **must** sync with React state on every change (rare — usually per-character validation feedback), keep controlled but isolate via `React.memo` and atomic state ([[rn-perf-atomic-state-management]]).
- **React Hook Form's `<Controller>` reintroduces the controlled pattern.** Prefer its `register()` API for performance.
- iOS auto-fill, 1Password, and iCloud Keychain can interact differently with uncontrolled inputs — test with real keyboards.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), "Uncontrolled Components", pp. 30–33.
- React Hook Form: https://react-hook-form.com
- RN New Architecture (synchronous layout & events): https://reactnative.dev/architecture/landing-page

## Related skills
- [[rn-perf-concurrent-react]] — `useDeferredValue` for the controlled-but-debounced case.
- [[rn-perf-atomic-state-management]] — isolating per-input state to a scoped atom when controlled is unavoidable.
- [[rn-perf-profile-js-react]] — measure the win in React Profiler.
- [[rn-perf-measure-js-fps]] — confirm typing-time FPS recovers.
