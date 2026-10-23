# FutureNow loading performance

## Production comparison

Measured on the same workspace snapshot with:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/futureready-my run build
```

Sizes below are decimal kB, using Vite's production output (not development-server transfers).

| Resource | Before | After |
| --- | ---: | ---: |
| Initial JavaScript | 961.25 kB | 382.14 kB |
| Initial JavaScript, gzip | 277.61 kB | 121.11 kB |
| Initial CSS | 160.23 kB | 140.55 kB |
| Initial CSS, gzip | 30.36 kB | 26.32 kB |
| Deferred chart JavaScript | Included above | 407.68 kB (110.00 kB gzip) |

Initial JavaScript is approximately **60.2% smaller**, or **56.4% smaller with gzip**.
The generated HTML references only the entry script, with no eager module-preload
links for charts or feature pages. No production chunk exceeds Vite's default
500 kB warning threshold.

The overview still needs chart code once its unemployment data is available.
Its eventual JavaScript total is approximately **789.83 kB** (231.11 kB gzip),
not 382.14 kB. Splitting defers work; it does not eliminate chart-library bytes.
Other feature chunks load only when their routes are visited.
These are bundle measurements, not a measured improvement in wall-clock load time.

## Loading boundaries

- Skills Profile, Future-Role Matching, Skill Gap Navigator, Coming Soon and
  Not Found are lazy route modules in `artifacts/futurer-now/src/App.tsx`.
- Overview, Job Records and National Context retain their small page renderers
  in the entry module. All Recharts rendering lives in the deferred
  `src/components/labor-charts.tsx` module.
- Chart loading begins only when a page renders a chart with available data.
  Existing query errors, empty states, filters, exports, chart options and
  dataset transformations are unchanged.
- Route loading uses the existing skeleton styling. A route-level error
  boundary keeps navigation available if a lazy import or page fails.
  Reload retries failed imports, since React caches rejected lazy imports;
  changing routes clears the displayed route error.
- Coming Soon is independent of the profile form, so visiting a planned module
  does not download the form. Its existing styling and content are retained.
- The query provider and navigation shell remain outside route suspense.
  Profile storage keys, validation, save/load logic and matching rules are unchanged.

## Verification

- Production build and frontend TypeScript check passed.
- All 10 existing profile persistence and matching-adapter unit tests passed,
  including draft/submitted round trips, corrupt/blocked storage and failed writes.
- Overview, Skills Profile and National Context deep links returned HTTP 200.
- Preview workflow started cleanly; the overview API returned JSON successfully.
- Visual inspection of the overview confirmed the original layout, populated
  metrics and lazily rendered chart, without browser errors.

The build still prints the pre-existing tooltip/label source-map notices.
