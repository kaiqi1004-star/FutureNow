---
name: Matching UI scope
description: Preserve FutureNow matching behavior while refining its presentation.
---

For FutureNow matching-screen UI refinements, keep scoring weights, ranking, source records, skill-equivalence rules, profile privacy boundaries, and SDG logic unchanged unless the user asks for a behavioral change. When a combined legacy skill category is split, migrate recognized language names to Languages without rewriting names, IDs, or evidence references; leave ambiguous custom items editable under Soft Skills.

**Why:** The user repeatedly scoped refinements to presentation and usability. A legacy combined category cannot distinguish every custom language from every custom soft skill, so conservative migration avoids silently changing uncertain profile meaning.

**How to apply:** Treat card and detail-page changes as display-only unless behavior is explicitly requested. For category migrations, preserve profile data and provide a category control for uncertain custom items; clarify before changing calculations, source data, or privacy boundaries.
