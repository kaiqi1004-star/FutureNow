---
name: Strict API request fields
description: The generated Zod client schema strips unknown request fields instead of rejecting them, even when OpenAPI forbids additional properties.
---

When an API contract forbids undeclared request properties, enforce that rule in the HTTP route as well as the OpenAPI schema. The generated Zod validator may strip unknown keys and still report success.

**Why:** A privacy-sensitive total-experience field could otherwise be silently accepted even though the matching API is meant to use relevant years only.

**How to apply:** For strict request objects, check undeclared top-level keys at the route boundary and include an HTTP-level test that verifies the rejected field receives a 400 response.
