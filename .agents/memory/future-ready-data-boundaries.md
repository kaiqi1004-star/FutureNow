---
name: FutureNow data boundaries
description: Evidence and communication rules for the FutureNow workforce-data project.
---

Treat the uploaded job records as a small sample, not a measure of national hiring demand. Do not invent job fields, salary values, dates, statistics, or source URLs. Do not claim the broad CSV datasets measure software or mechanical engineering demand unless their contents establish that. Keep unknown wage currency/period and person-count scales explicit, and do not compare aggregate CSV wages to monthly RM job salaries until the source metadata verifies the units.

The user is a beginner and wants implementation explanations in simple terms.

**Why:** The user's project brief explicitly set these evidence limits and asked for simple implementation explanations.

**How to apply:** Preserve these constraints in new analysis, charts, transformations, labels, and explanations; use the uploaded files as the evidence source and state unknowns plainly.

Minimal, backward-compatible schema extensions are preferred over misclassifying new occupations or reducing disclosed salary bands to invented single values. Career categories are title-derived app groupings, not the source Industry field.

**Why:** The user explicitly approved extending the original two-category, single-salary schema so the expanded workbook could be imported without losing source meaning.

**How to apply:** Preserve raw salary text and source spelling, keep unknown fields unknown, and label derived category counts separately from record and distinct-title counts.
