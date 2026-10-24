---
name: Matching UI scope
description: Preserve FutureNow matching behavior while refining its presentation.
---

For FutureNow matching-screen UI refinements, keep scoring weights, ranking, source records, skill-equivalence rules, profile privacy boundaries, and SDG logic unchanged unless the user asks for a behavioral change. When a combined legacy skill category is split, migrate recognized language names to Languages without rewriting names, IDs, or evidence references; leave ambiguous custom items editable under Soft Skills.

**Why:** The user repeatedly scoped refinements to presentation and usability. A legacy combined category cannot distinguish every custom language from every custom soft skill, so conservative migration avoids silently changing uncertain profile meaning.

**How to apply:** Treat card and detail-page changes as display-only unless behavior is explicitly requested. For category migrations, preserve profile data and provide a category control for uncertain custom items; clarify before changing calculations, source data, or privacy boundaries.

Localization must translate general skills and professional concepts for display, while keeping original listing evidence, job/company names, technical brands, matching terms and stored skill identities unchanged. Unknown terms must remain visible rather than being omitted or guessed.

**Why:** The user explicitly requested complete EN/BM/Simplified Chinese support without language changes altering matching results or source integrity.

**How to apply:** Keep localized labels separate from source values. Use the original skill strings in comparisons and persistence, preserve raw evidence alongside translated labels, and audit newly introduced general terms for missing translations.
