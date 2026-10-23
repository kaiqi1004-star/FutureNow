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

Derived skill summaries may group established spelling aliases and classify Payroll separately as an HR-domain skill; count each job at most once per canonical skill without rewriting record text.

**Why:** Summary counts should make equivalent terms comparable while preserving the workbook's wording and avoiding duplicate mentions.

**How to apply:** Normalize only aggregate calculations and display labels. Keep source records unchanged, and add alias or domain rules only when supported by the supplied role and skill evidence.

Role matches must remain explainable estimates, not hiring probabilities or promises of job security. A missing profile skill means “not found in the profile,” not proven absence. Do not infer specific expertise from broad skill labels, free-text achievements, or self-rated proficiency.

**Why:** The Feature 2 brief explicitly requires transparent, deterministic matching without fabricated skills or employment outcomes. Equal-weight listed-skill coverage was chosen because the source records do not support validated weighting of the broader profile fields.

**How to apply:** Keep broader profile answers as context unless a future change supplies defensible evidence for scoring them. Preserve an auditable profile-term-to-source-requirement explanation.

SDG connections must use real UN goal numbers and titles, remain conditional and indicative, and never imply official UN classification of jobs. Use review status for assessed but unsupported connections, and a separate neutral “Not assessed” state for unevaluated wording or profile-only applications. No connections does not automatically mean review is required.

**Why:** The user's Feature 2 briefs prioritise defensible mappings over indiscriminate goal tagging. The user specifically reported excessive review warnings when unassessed terms were treated as failed mappings; job requirements alone do not establish real-world SDG outcomes.

**How to apply:** Ground mappings in actual source skill or role evidence, supply official UN references, contribution conditions and an explanation, and retain review flags when assessed evidence is insufficient. General skills such as communication or spreadsheets need a specific source-supported application, not a title-only assumption. Keep the catalogue's incomplete coverage explicit.

Experience-fit comparisons must remain separate from the skill score. Preferred requirements, fresh-graduate exceptions, and alternative qualification paths must not become automatic numeric eligibility failures.

**Why:** The user explicitly requested an experience warning without changing skill coverage or ranking. Total stated years cannot establish relevant-domain experience, and source exceptions can make simple thresholds misleading.

**How to apply:** Warn about a clear numeric shortfall separately, leave ambiguous requirements for manual comparison, and never treat meeting a numeric minimum as proof of eligibility.
