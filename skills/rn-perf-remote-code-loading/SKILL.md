---
name: rn-perf-remote-code-loading
description: Use when the user wants to defer non-critical screens via dynamic import / React.lazy / Suspense in a React Native app, ship code chunks from a CDN, or build a microfrontend — sets up Re.Pack (Webpack/Rspack bundler), webpackChunkName split points, and ScriptManager resolvers. Trigger whenever the user mentions Re.Pack, code splitting, dynamic import, React.lazy in RN, Module Federation, microfrontends, Zephyr Cloud, an app exceeding the 200 MB Google Play limit, or "my app isn't using Hermes and is too big" — but discourage in small/medium Hermes apps where mmap'd bytecode already makes split-loading nearly free.
---

# Load React Native Code Remotely With Re.Pack

## When to use
The user wants dynamic `import()` / `React.lazy` / Module Federation in a React Native app, or has hit a Google Play 200 MB ceiling, or is on JSC/V8 (not Hermes). With Hermes, code-splitting yields minimal TTI benefit because Hermes already mmaps the bytecode on demand.

## What this skill does (single responsibility)
Migrate the app off Metro to Re.Pack so production code-splitting works, then convert one rarely-used feature (settings, support, debug UI) into a remotely-loaded chunk wrapped in `Suspense`, and configure `ScriptManager` to fetch chunks from a CDN at runtime. Does **not** cover the simpler "ship one tighter main bundle" path (see [[rn-perf-tree-shaking]]), bundle measurement (see [[rn-perf-analyze-js-bundle]]), or core Suspense semantics (see [[rn-perf-concurrent-react]]).

## Workflow
1. **Gate first.** Apply this skill only if one of these holds (book p. 163):
   - App not using Hermes (JSC/V8).
   - Concrete need: A/B variants, feature-flagged whole screens.
   - App size materially harming UX.
   - App exceeds Google Play's 200 MB single-binary cap.
   - Microfrontend architecture with Module Federation.
   - Other optimisations exhausted.
   If you're a small-to-medium Hermes app, **stop and run [[rn-perf-tree-shaking]] first**.
2. Migrate to Re.Pack: `npx @callstack/repack-init`. Follow the Re.Pack migration guide for plugin/loader incompatibilities (asset plugins, custom Metro resolvers).
3. Pick a deferral candidate that's **not on the init path** — settings, support flows, in-app payment, debug UI, rarely-used flows.
4. Convert the import to `React.lazy` with a `webpackChunkName` magic comment.
5. Wrap usage in `<Suspense fallback={...}>`.
6. Add a `ScriptManager.shared.addResolver` in `index.js` that returns dev-server URLs under `__DEV__` and CDN URLs in production.
7. Build for production and confirm a `feature.chunk.bundle` file is emitted alongside `main.bundle`.
8. Upload chunks to your CDN (Cloudflare/Fastly/S3+CloudFront, or Zephyr Cloud for federated builds). Use content-hash filenames; set HTTP cache headers.
9. For microfrontends, layer Module Federation on top — but treat that as an organisational decision, not just a perf one.

## Code patterns

Split-point conversion (book p. 165):

```ts
-import React from 'react';
+import React, { Suspense } from 'react';
-import SettingsScreen from './screens/SettingsScreen';

+const SettingsScreen = React.lazy(() =>
+  import(/* webpackChunkName: "settings" */ './screens/SettingsScreen')
+);

 const App = () => {
   return (
+    <Suspense fallback={<LoadingSpinner />}>
       <SettingsScreen />
+    </Suspense>
   );
 };
```

`ScriptManager` resolver in `index.js`:

```ts
import { ScriptManager, Script } from '@callstack/repack/client';

ScriptManager.shared.addResolver((scriptId) => ({
  url: __DEV__
    ? Script.getDevServerURL(scriptId)
    : `https://my-cdn.com/assets/${scriptId}`,
}));

AppRegistry.registerComponent(appName, () => App);
```

Init Re.Pack in an existing project:

```
npx @callstack/repack-init
```

## Verification
- Production build emits separate `*.chunk.bundle` files alongside `main.bundle`.
- DevTools / proxy Network panel shows the chunk fetched only when the user navigates into the gated screen.
- Measure TTI before/after (see [[rn-perf-measure-tti]]). On Hermes, expect modest changes; on JSC, expect substantial init-time wins.
- Confirm offline behaviour: cache chunks (Re.Pack docs) or accept the gated screen failing without network.

## Edge cases & gotchas
- **Hermes makes this far less compelling.** Don't take on Re.Pack migration just for code-splitting unless one of the gate conditions actually applies (book p. 163).
- **Re.Pack ≠ Metro.** Migration involves config rewriting; libraries that hook Metro's serializer/resolver may break (some asset and HMR plugins).
- **Chunk caching is your problem.** After an app update, users may have stale chunks. Use content-hash filenames and HTTP cache headers.
- **Offline-first apps** must bundle chunks inline, defeating the purpose. Code-splitting assumes connectivity at first use.
- **Module Federation complexity is high.** Version drift between micro-apps is "challenging to handle on your own" (book p. 166). Zephyr Cloud is the book's recommended integration partner.
- **App store policy**: Apple historically restricts shipping new executable code at runtime. JS that doesn't change app capabilities is fine (this is how CodePush/EAS Update operate), but verify policy if chunks add fundamentally new functionality.
- **Suspense fallback flicker**: design the loading state — users see it on every first chunk load.

## References
- Book: "The Ultimate Guide to React Native Optimization" (2025), chapter "Load Code Remotely When Needed", pp. 163–166
- Re.Pack: https://re-pack.dev
- Zephyr Cloud: federated builds with managed version drift

## Related skills
- [[rn-perf-tree-shaking]] — try first; usually the right answer for Hermes apps
- [[rn-perf-analyze-js-bundle]] — measure what's actually in main vs. chunks
- [[rn-perf-measure-tti]] — primary metric this skill targets
- [[rn-perf-concurrent-react]] — Suspense fundamentals
- [[rn-perf-analyze-app-bundle]] — relevant when chasing the 200 MB Play ceiling
