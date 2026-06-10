---
name: rn-perf-network-data-layer
description: Use when a React Native screen loads slowly due to request waterfalls, sequential dependent fetches on mount, refetch storms, missing `staleTime`, `cacheTime` vs `gcTime` confusion, TanStack Query / react-query misuse, `useQuery`, `prefetchQuery`, `useInfiniteQuery`, multi-MB JSON payloads blocking the JS thread, GraphQL over-fetching, or uncompressed API responses. Diagnoses fetch waterfalls in the React Native DevTools Network panel and restructures the data layer with parallel/prefetched queries, tuned caching, persisted cache warm starts, and payload discipline.
---

# Network & Data Layer Performance

## When to use
The user reports a screen that shows a spinner for seconds after navigation, data that loads "one thing after another", excessive refetching on focus or remount, scroll jank when a large API response lands, or wants guidance on TanStack Query setup, prefetching, pagination, or response payload size in a React Native app.

## What this skill does (single responsibility)
Optimizes how the app fetches, caches, and parses remote data: eliminating request waterfalls, parallelizing and prefetching queries, tuning TanStack Query caching, persisting the cache for warm starts, and keeping JSON payloads small enough that parsing does not block the JS thread. Out of scope: choosing or restructuring the client state library ([[rn-perf-atomic-state-management]]), where the cache is persisted and storage engine performance ([[rn-perf-storage]]), and masking unavoidable latency with skeletons or optimistic UI ([[rn-perf-perceived-performance]]).

## Workflow
1. **Measure a baseline.** Open the React Native DevTools Network panel ([[rn-perf-react-native-devtools]]) and record the request timeline for the slow screen on the same device and build you will re-test later. A staircase of requests where each starts only after the previous finishes is a waterfall. Also note time-to-content with [[rn-perf-measure-tti]] if the screen is on the startup path.
2. **Check installed versions.** Read `package.json`: `@tanstack/react-query` major (v4 uses `cacheTime`, v5 renamed it to `gcTime`; v5 requires a single object argument to `useQuery`), plus any persister packages. Do not paste v5 snippets into a v4 app. Adding TanStack Query or a persister is a supply-chain change — pin versions and get it reviewed like any new dependency.
3. **Break the waterfall.** Independent requests fire together (`Promise.all` or multiple `useQuery` hooks at the same level). Dependent requests should be collapsed server-side where possible, or the parent data prefetched earlier.
4. **Hoist fetches above the render (fetch-as-you-render).** Start fetching on navigation intent — `onPressIn`, list-item visibility, or the navigation action itself — via `queryClient.prefetchQuery`, instead of waiting for the destination screen to mount.
5. **Stop refetch storms.** Set a sensible `staleTime` per query (default is `0`, so every remount/focus refetches). Audit `refetchOnWindowFocus`/`refetchOnMount` behavior against product needs.
6. **Subscribe narrowly.** Use the `select` option so components re-render only when their slice of the response changes; use `useInfiniteQuery` for pagination instead of manually accumulating pages in component state.
7. **Persist the cache for warm starts.** Wire `@tanstack/query-persist-client` (v5; `persistQueryClient` in v4) to an MMKV-backed persister so returning users see cached data instantly — see [[rn-perf-storage]] for the storage engine.
8. **Enforce payload discipline.** Multi-MB JSON responses are parsed on the JS thread and visibly drop frames. Paginate, trim fields server-side (or fix GraphQL queries that over-fetch entire objects when the screen needs three fields), and never re-parse the same blob on every access.
9. **Verify compression.** Confirm responses arrive gzip/brotli-compressed (check `content-encoding` in the Network panel or with `curl`).
10. **Re-measure.** Repeat step 1 on the same device/build/interaction and compare the request timeline and time-to-content before merging.

## Code patterns

Waterfall (bad) vs parallel (good) for independent data:

```tsx
// BAD: each await blocks the next — three round-trips in series
const user = await fetchUser(id);
const feed = await fetchFeed();
const banners = await fetchBanners();

// GOOD: independent requests fire together
const [user, feed, banners] = await Promise.all([
  fetchUser(id),
  fetchFeed(),
  fetchBanners(),
]);
```

Prefetch on navigation intent (TanStack Query v5):

```tsx
const queryClient = useQueryClient();

<Pressable
  onPressIn={() =>
    queryClient.prefetchQuery({
      queryKey: ['product', id],
      queryFn: () => fetchProduct(id),
      staleTime: 60_000,
    })
  }
  onPress={() => navigation.navigate('Product', { id })}
/>
```

Sane defaults and v4/v5 naming (check the installed major first):

```tsx
// v5
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 24 * 60 * 60 * 1000 },
  },
});
// v4: the gcTime option above is named cacheTime
```

Subscribe to a slice with `select` to cut re-renders:

```tsx
const unreadCount = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  select: (data) => data.filter((n) => !n.read).length,
});
// component re-renders only when the count changes, not on every payload byte
```

Pagination with an infinite query instead of accumulating state:

```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam }),
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

Persist the query cache to MMKV for instant warm-start data (v5):

```tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'query-cache' });
const persister = createSyncStoragePersister({
  storage: {
    getItem: (k) => storage.getString(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  },
});

<PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
  <App />
</PersistQueryClientProvider>
```

Verify compression from the terminal:

```bash
curl -sI -H 'Accept-Encoding: gzip, br' https://api.example.com/feed | grep -i content-encoding
```

## Verification
- Network panel shows previously sequential requests starting in parallel; the staircase is gone.
- Time from navigation to content (or TTI for startup screens) improved on the same device/build/interaction as the baseline.
- Remounting or refocusing the screen no longer triggers refetches inside the `staleTime` window.
- Components using `select` show fewer commits in the React Profiler when unrelated parts of the payload change.
- Cold-start with a persisted cache renders cached data before the network responds.
- `content-encoding: gzip` or `br` present on large responses; large list payloads are paginated.

## Edge cases & gotchas
- v4 → v5 renames: `cacheTime` → `gcTime`, `isLoading` semantics changed (`isPending` is the v5 initial-load flag), and v5 only accepts the object signature. Mixing major-version snippets is the most common copy-paste failure.
- `gcTime` must be >= the persister `maxAge`, otherwise the cache is garbage-collected before it can be restored.
- Persisting a huge query cache can itself slow startup — whitelist queries with `dehydrateOptions.shouldDehydrateQuery` rather than persisting everything.
- `select` results must be referentially stable for the memoization to help; derive with a stable function, not an inline arrow recreated with new closures over changing values.
- Prefetch-on-press-in fires for accidental touches; keep prefetched queries cheap or gate by route importance.
- React Native's `fetch` handles gzip transparently, but brotli support depends on the platform networking stack — verify on both iOS and Android, not just one.
- Do not add `React.memo`/`useMemo` around fetch consumers speculatively; fix the data layer first and only memoize what the Profiler proves is re-rendering.
- JSON parsing happens synchronously on the JS thread; if a payload must be large, consider streaming/pagination at the API rather than chunked parsing hacks in JS.

## References
- TanStack Query v5 migration guide: https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5
- TanStack Query prefetching: https://tanstack.com/query/v5/docs/framework/react/guides/prefetching
- TanStack Query persistence: https://tanstack.com/query/v5/docs/framework/react/plugins/persistQueryClient
- React Native DevTools: https://reactnative.dev/docs/react-native-devtools
- react-native-mmkv: https://github.com/mrousavy/react-native-mmkv

## Related skills
- [[rn-perf-storage]] - MMKV persister and where the cache lives on disk
- [[rn-perf-concurrent-react]] - keeping the UI responsive while data lands
- [[rn-perf-atomic-state-management]] - server cache vs client state boundaries
- [[rn-perf-measure-tti]] - quantifying startup-path data fetching cost
- [[rn-perf-production-monitoring]] - tracking API latency and screen load in the field
- [[rn-perf-react-native-devtools]] - Network panel waterfall diagnosis
- [[rn-perf-perceived-performance]] - masking latency you cannot remove
