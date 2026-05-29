---
name: rn-perf-react-compiler
description: Use when the user wants to install, configure, debug, or verify the React Compiler in a React Native project — or mentions `babel-plugin-react-compiler`, `eslint-plugin-react-compiler`, `react-compiler-runtime`, `useMemoCache`, the "Memo ✨" badge in DevTools, the React Compiler Playground, removing manual `React.memo`/`useMemo`/`useCallback`, or wants automatic memoization instead of hand-memoizing. Trigger whenever the user says "I have too many `useMemo`s" or "can I get rid of these `useCallback`s", even if they don't name the compiler.
---

# React Compiler Setup for Automatic Memoization

## When to use
The user is hand-memoizing with `React.memo`/`useMemo`/`useCallback` and wants the compiler to do it instead, or is hitting cascading re-renders and would rather automate the fix than refactor to atomic state. Beta as of January 2025 — already used in production at Meta and shipping in Expensify.

## What this skill does (single responsibility)
Installs and configures `babel-plugin-react-compiler` and `eslint-plugin-react-compiler`, sets `target` correctly for React 18 vs React 19, scopes incremental adoption with `sources`, overrides the bundled `react-devtools` so the `Memo ✨` badge appears, and verifies the optimization in DevTools. Out of scope: manual memoization patterns (these go away once the compiler is in), atomic state refactors ([[rn-perf-atomic-state-management]]), and runtime profiling ([[rn-perf-profile-js-react]]).

## Workflow
1. **Install the ESLint plugin first** (safe, no runtime change):
   ```
   npm install -D eslint-plugin-react-compiler@beta
   ```
   Add `'react-compiler/react-compiler': 'error'` to your ESLint config. The compiler bails silently on files that break Rules of React, so this is the only way to see what it skipped.
2. **Fix the violations the linter surfaces.** Class components, mutated props, conditional hooks, etc. — the compiler will not optimize these (book p. 53).
3. **Install the Babel plugin:**
   ```
   npm install -D babel-plugin-react-compiler@beta
   ```
   For projects on React < 19 (RN < 0.78), also install `react-compiler-runtime@beta` and set `target: '18'`.
4. **Configure `babel.config.js`** with the correct `target`.
5. **Adopt incrementally with `sources`.** If the compiler chokes on certain files, scope it down rather than disabling globally — beta software regressing one screen shouldn't block the whole app (book p. 54).
6. **Override the bundled `react-devtools` to ≥ 6.0.1** in `package.json` so DevTools displays `Memo ✨` badges. RN ships its own version, so you have to force the override (book p. 58).
7. **Verify in DevTools.** Open the Components panel; optimized components show `Memo ✨`. Missing badges with a successful build usually mean the DevTools version is too old.
8. **Re-profile.** Use the Profiler (see [[rn-perf-profile-js-react]]) on the same scenario you measured before. Cascading re-renders should narrow to truly-affected components.

## Code patterns

ESLint config (book p. 53):

```js
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  {
    plugins: { 'react-compiler': reactCompiler },
    rules: { 'react-compiler/react-compiler': 'error' },
  },
];
```

Babel config — set `target: '18'` for RN < 0.78, `'19'` otherwise (book p. 53):

```js
const ReactCompilerConfig = {
  target: '19',
};

module.exports = function () {
  return {
    plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
  };
};
```

Incremental adoption — scope the compiler to one directory so a regression in unknown code doesn't block rollout (book p. 54):

```js
const ReactCompilerConfig = {
  sources: (filename) => filename.indexOf('src/path/to/dir') !== -1,
};
```

What the compiler emits, for grounding — given a `MyApp` reading `value`, it imports `c` from `react/compiler-runtime` and rewrites the JSX to read from a per-render cache `$` keyed on the inputs. Shallow comparison, same rule as `React.memo` (book p. 55):

```tsx
import { c as _c } from 'react/compiler-runtime';
export default function MyApp() {
  const $ = _c(2);
  const [value, setValue] = useState('');
  let t0;
  if ($[0] !== value) {
    t0 = <TextInput onChangeText={() => setValue(value)}>Hello World</TextInput>;
    $[0] = value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
```

`useMemoCache` conceptual implementation — a stable per-instance array of slots, polyfilled by `react-compiler-runtime` for React 18 (book p. 55):

```ts
function useMemoCache(n) {
  const ref = useRef(Array(n).fill(undefined));
  return ref.current;
}
```

## Verification
- **`Memo ✨` badge in DevTools Components panel** for optimized components (book p. 57). If absent, override `react-devtools` to ≥ 6.0.1 in `package.json`.
- **Profiler before/after** on the same interaction — cascading re-renders should narrow to truly-affected components (the book's Expensify screenshot, p. 57, shows a deep flamegraph collapse to a sparse one).
- **Quantitative target:** a few-percent improvement on Time-to-Interactive (Expensify saw 4.3% on Chat Finder TTI, book p. 56). Apps already heavily memoized see less.
- **Build doesn't break.** If the compiler fails on a file, narrow `sources`; don't disable globally.
- **Paste a component into the React Compiler Playground** (https://playground.react.dev/) to see exactly what it rewrites to.

## Edge cases & gotchas
- **Shallow comparison only.** "Be careful when using objects or arrays as props. If their reference changes, they will be treated as new values" (book p. 55). Pass primitives or stable references.
- **The compiler silently skips non-conformant code.** Class components, code that breaks Rules of React, outdated patterns get no optimization (book p. 53). The ESLint plugin is the only way to spot the gap.
- **Missing `Memo ✨` despite a clean build** usually means the bundled `react-devtools` is too old. Override in `package.json` (book p. 58).
- **Don't strip manual memoization yet** (book p. 56). Wait for the official "stable + remove your memos" guidance; the linter is expected to flag the ones that became redundant.
- **React Native specific** (book p. 58): "React Compiler is built for universal React but primarily tested in web environments. Enabling it in React Native might require additional steps to ensure `Memo ✨` badges appear correctly."

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "React Compiler", pp. 52–58
- `babel-plugin-react-compiler` — https://www.npmjs.com/package/babel-plugin-react-compiler
- `eslint-plugin-react-compiler` — https://www.npmjs.com/package/eslint-plugin-react-compiler
- `react-compiler-runtime` (React 17/18 polyfill) — https://www.npmjs.com/package/react-compiler-runtime
- React Compiler Playground — https://playground.react.dev/

## Related skills
- [[rn-perf-atomic-state-management]] — alternative path; the book contrasts them at p. 45 and the compiler usually wins for ergonomics.
- [[rn-perf-profile-js-react]] — measure the win.
- [[rn-perf-uncontrolled-components]] — orthogonal; the compiler can't fix a controlled-input re-render storm.
- [[rn-perf-concurrent-react]] — once the compiler is in, the `React.memo` requirement around `useDeferredValue` consumers is automated.
- [[rn-perf-measure-tti]] — Expensify's win was on TTI; that's the right metric to track.
