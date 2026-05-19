
## Root cause

The whole app boots blank because:

1. `App.tsx` statically imports `BarbersDirectory` → which statically imports `BarberMapDirectory` → which does `import mapboxgl from 'mapbox-gl'` at module top level.
2. Vite tries to pre-bundle `mapbox-gl` (a heavy 3.x package with workers) and the request times out with **504**.
3. The static import chain means the dep failure crashes app boot for every route, not just `/barbers`.

Browser console confirms: `Failed to load resource: 504 … /node_modules/.vite/deps/mapbox-gl.js`.

## Fix (two changes)

### 1. Tell Vite how to handle mapbox-gl

Update `vite.config.ts`:
```ts
optimizeDeps: {
  include: ['mapbox-gl'],
},
```
Forces explicit pre-bundling instead of lazy on-demand bundling which is what's timing out.

### 2. Lazy-load BarbersDirectory route

In `src/App.tsx`, swap the static import for `React.lazy()` and wrap the route in `<Suspense>`. This:
- Keeps `mapbox-gl` out of the initial chunk (faster cold start everywhere else)
- Isolates any future map-engine failure to the `/barbers` route only — homepage will never blank again because of map issues
- Standard pattern for heavy WebGL deps

### 3. Restart dev server

After the config change, Vite needs a restart to re-run optimizeDeps cleanly (cached failed entry needs to clear).

## Files

- **Modify**: `vite.config.ts` (add optimizeDeps.include)
- **Modify**: `src/App.tsx` (lazy-load `BarbersDirectory`, ensure Suspense fallback covers the route)

No DB or other component changes. The map itself is already correct from the previous task.

## Verification

- Reload `/` → homepage renders normally
- Navigate to `/barbers` → loading state briefly, then Mapbox dark-v11 map appears with search bar
- Console: no 504 on mapbox-gl
