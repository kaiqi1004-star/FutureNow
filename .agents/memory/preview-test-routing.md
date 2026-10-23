---
name: Preview testing through the artifact proxy
description: A misleading failure mode when browser tests bypass shared path-based routing.
---

End-to-end checks must enter through the shared artifact preview proxy, not the frontend's direct Vite port.

**Why:** Direct Vite navigation can render frontend pages correctly while `/api` calls return the HTML fallback as a successful response. This produces misleading array-method failures in otherwise-working pages and looks like damaged API data.

**How to apply:** Use the shared proxy origin for browser tests and check the response content type before diagnosing API shape regressions. A static profile page succeeding at the Vite port does not validate API-backed routes.
