# FutureNow — Feature 1 / Feature 2 audit and reliability report

## Scope and evidence

Audited the existing React profile editor and matching page, local profile schema/storage, generated API client, Express routes, matching/experience/education/SDG functions, authoritative job JSON, workbook-integrity tests, managed workflows and development/production configuration. No application replacement or dataset edits.

The supplied collection has **50 records, 50 unique IDs, and 25 distinct job titles**. Records are a supplied sample, not national hiring-demand evidence.

## Reported matching failure: what was and was not established

Before changes, retained runtime logs showed matching POST requests returning HTTP 200 and successful job-data requests. No retained failing request, matching stack trace, or failing browser profile was available. A saved profile belongs to its browser; an isolated audit browser cannot inspect the user's own localStorage.

Consequently, the precise historical exception behind “Matches could not be generated” **was not reproduced or established**. It would be inaccurate to attribute that event to zero suitable jobs, the frontend, or the backend without further evidence.

Confirmed weaknesses:

1. The frontend used a generic mutation-error message for network, request-validation and server failures. It did not separately load jobs after a matching failure.
2. The API matcher read the job JSON on each request. Its path was based on `process.cwd()`. Development starts in the API package, but the configured production command starts the bundled API from the workspace root. Root `data/jobs.json` does not exist, while `artifacts/api-server/data/jobs.json` does. This is a reproducible **latent production data-path defect**, not proof of the reported Preview incident. Deployment metadata confirmed this project was not published.
3. The previous strongest compatibility label ignored skill evidence, allowing zero coverage to receive “Better-aligned opportunity.”
4. The profile library offered only 19 broad preset selections, despite many specific supplied requirements.

The data path now resolves relative to the API service module, supporting both source and bundled execution. API logs retain request-correlated error codes without logging submitted profile fields. Public errors are safe JSON, not stack traces.

## Scoring: before and after

**Numeric weighting is unchanged:** skills 60, experience 25, education 15.

`overall = round1(sum(available dimension score × weight) / sum(available weights))`.

Unavailable dimensions are excluded, not assigned zero or 100. If all are unavailable, the estimate is unavailable.

`skill coverage = round1(matched distinct listed requirements / all distinct listed requirements × 100)`.

Each listed technical or soft-skill requirement has equal weight. Canonical duplicates count once; the original job fields are retained unchanged.

Experience:

- For one comparable source minimum/range, `round1(min(100, total self-reported years / lower threshold × 100))`; a zero threshold yields 100.
- A clearly mandatory shortfall creates a significant requirement gap; a preferred or ordinary source-range shortfall does not become a mandatory eligibility rejection.
- Alternative paths, upper-bound wording and qualitative requirements remain uncertain/unscored where a simple comparison is unsupported.
- When source wording is not comparable and a title establishes seniority, internal guidelines are internship/entry 0, mid/senior 2, lead 3, manager 4 years. These are prominently labelled estimates, never employer requirements.
- An unspecified role with no supported guideline has unavailable experience suitability, not a confirmed perfect match.
- Total years do not verify relevant-domain work, portfolios, leadership, or eligibility.

Education:

- Supported ranks: secondary/SPM/SKM 1–3 = 1; certificate = 2; diploma/DVM/DKM/DLKM 4–6 = 3; bachelor = 4; master = 5; doctorate = 6.
- Choose the lowest recognised level in the supplied alternatives, then `round1(min(100, user level / source minimum level × 100))`.
- Missing, unrecognised, conditional and noncomparable values remain unavailable/uncertain.
- Level comparison does not verify field of study, equivalency or every employer condition.

### Compatibility labels and deterministic order

The label policy—not numeric weights—was corrected:

- **Tier 3 / Significant requirement gap:** clear shortfall against a mandatory source experience or education requirement.
- **Tier 2 / Potential stretch:** insufficient listed-skill evidence, nonmandatory shortfalls, or unresolved experience/education comparisons.
- **Tier 1 / Better-aligned opportunity:** at least 50% total skill coverage and at least 50% technical coverage where technical skills are listed, with compatible experience/education and no unresolved comparisons.

The 50% gates are transparent **product guidance heuristics**, not empirically validated hiring thresholds. They prevent general soft skills or years alone producing the strongest label. Technical coverage is also displayed separately. Numeric overall scores retain the same weighting.

Order remains compatibility tier, overall estimate descending, coverage descending, then numeric record ID. Unknown scores sort behind known scores within their tier. Stretch roles are never removed. Salary, category, interests, free text, readiness and proficiency do not increase scores. No score is a hiring probability.

## Reliable results

- Successful matching: display all actual returned records, including weak matches.
- No stronger-aligned records: explicit guidance notice; records remain visible with gaps and uncertainty.
- Matching error: explanatory notice and explicit retry. A separate jobs request retrieves the real collection.
- Fallback: exact normalized saved-name overlaps first, then numeric source ID. This conservative order is explicitly labelled **General supplied job listings / Fallback listing order**. It does not use overall scores, career-fit labels, inferred skills or the full personalised algorithm.
- Fallback preserves original titles, companies, platforms, salary wording, requirements and available source URLs. If no exact overlaps exist, order is numeric source ID.
- Dataset request failure: accurate data-unavailable notice and retry, never sample jobs. Previously loaded real records may remain visible with an explicit refresh-failed notice.
- Empty dataset: distinct empty-source message, not “no suitable jobs.”
- No automatic retry loop. Retry/navigation do not rewrite the saved profile.

## Skill library and matching evidence

Four existing profile categories remain. The picker now has **146 preset selections in 10 searchable groups**: broad technical areas; programming/software; data/databases; AI/cloud/infrastructure; digital productivity; soft skills/languages; engineering; digital marketing; HR; accounting/finance.

The 127 additional selections prioritise actual supplied requirements, including Python, JavaScript, TypeScript, Java, SQL, database tools, Excel, Sheets, Power BI, Tableau, Git, debugging/testing, cloud deployment, Azure, Linux, SolidWorks, mechanical design, automation, payroll, recruitment and accounting tools. Java and TypeScript are explicitly present in a source one-of alternative; Mandarin is supported separately by title evidence. Candidate technologies absent from the supplied evidence were not blindly added.

Custom entry, existing profile envelope and proficiency levels are preserved. No skills are automatically added. The existing 150-skill storage/request limit is now also enforced when adding in the editor.

Match types:

- **Exact:** Unicode/case/whitespace normalization only.
- **Equivalent:** curated name aliases, including JS/JavaScript, HTML5/HTML, CSS3/CSS, React name variants, MS/Microsoft Excel, SQL Server variants, REST API plural variants, and established spelling variants.
- **Source-listed alternative:** only explicitly configured one-of source wording.
- **Related:** curated directional links such as Programming → Python/debugging, Database management → SQL, or Cloud computing → Azure. These remain unmet requirements and contribute **zero** confirmed matches or score.
- Unknown/custom terms remain visible rather than being fuzzy-matched.

Original source text accompanies matching explanations. A Mandarin-speaking title signal appears separately and changes neither coverage, score nor tier. Proficiency remains self-reported and unweighted.

## SDG and presentation

Existing underlying SDG assessments and conditional mapping rules were retained, not deleted or loosened. Existing real-data tests confirm generic traits/tools or titles alone cannot establish a contribution.

Public UI hides unsupported/empty SDG sections and review/not-assessed noise. Role summaries show the source evidence; identical individual-skill contextual explanations are grouped and expanded on demand. Conditions, context and official UN references remain available. A mapped skill never guarantees an SDG outcome.

Privacy wording no longer requires users to understand “stateless matcher.” Company and source platform are labelled separately. Unlisted profile skills are collapsed by default. Matched, related, title-derived and missing evidence are separate.

## Changed files

- API: `src/routes/future-ready.ts`; `src/lib/data-directory.ts`, `career-fit.ts`, `role-matching.ts`, `skill-gap.ts`, `role-skill-context.ts`.
- Frontend: `src/pages/skills-profile.tsx`, `future-role-matching.tsx`; `src/lib/skills-profile.ts`, `skill-catalogue.ts`, `job-fallback.ts`; `src/components/job-match-fallback.tsx`.
- Contract: `lib/api-spec/openapi.yaml` and generated client/Zod schemas and types.
- Tests: API `matching-audit.test.mjs`, `role-matching.test.mjs`; frontend `job-fallback.test.ts`, `skills-profile.test.ts`, and updated legacy matching-browser assertions.
- This audit document. No data JSON/workbook changes, networking-port changes or unrelated redesign.

## Verification and limitations

Verified:

- API: **48 tests passed**, including the workbook-to-JSON field integrity check.
- Frontend model/regression tests: **31 passed**; translation catalogue tests: **2 passed** after bundling the existing TSX import with esbuild.
- Full workspace TypeScript check passed.
- Frontend production build passed; API build passed in the restarted managed workflow.
- Actual proxy requests: jobs and matcher both confirmed 50 records; API response retained 60/25/15 weights and a separate Mandarin signal.
- Preview screenshot loaded cleanly.
- Original JSON has no changes.
- Final workspace typecheck, frontend build and `git diff --check` passed after the completed changes.

### End-to-end browser result: passed

An isolated browser loaded an existing five-skill profile, added Python through the searchable picker, saved a draft and reloaded. All six selections, the custom skill and proficiency values survived. The actual matching request contained only the three authorised fields and returned 50 unique records.

The tested beginner profile produced 36 Tier 2 and 14 Tier 3 results, not false strongest-fit labels. J43 displayed 11.1% listed-skill coverage and 20% technical coverage; Microsoft Excel was an equivalent-name match for Excel, while Mandarin remained a separate, unscored title signal. Unsupported SDG sections were absent and unlisted profile skills were collapsed.

A one-request simulated matching outage displayed the actual 50-job fallback, without personalised scores or fit labels. Removing the interception and retrying restored real personalised matches.

A fresh-page simulated matching plus job-data outage displayed the data-unavailable state, without fabricated listings. Restoring job loading and retrying recovered 50 real fallback records; restoring matching and retrying recovered 50 personalised results. Requests stayed bounded, the saved profile was unchanged, and no uncaught page errors or public error stacks were observed.

The legacy standalone browser-script assertions were updated for the new tier policy; that script was not separately rerun in addition to the end-to-end pass.

An initial test run exposed a missing `.ts` import in a new module and a source-alternative assumption in the new catalogue test; both were corrected. An existing translation mock also double-prefixed its nested label/template and was replaced by a realistic dictionary-based assertion. Plain Node cannot import the existing TSX translation module directly; its bundled test passes.

There is no configured lint script. Existing build warnings remain: sourcemap-location warnings for tooltip/label and a JavaScript chunk over 500 kB. No attempt was made to redesign or broadly optimise unrelated code.

The supplied collection has no blank education field. Missing-education handling is tested with a copy of an actual record whose education is deliberately blanked; it is not represented as an original missing field.

The original failing browser/profile event remains unconfirmed. No live deployment was tested or published. New detailed English messages may fall back to English where the existing Malay/Chinese catalogue lacks a translation. Related-skill and SDG catalogues remain deliberately incomplete rather than inferring unsupported evidence.
