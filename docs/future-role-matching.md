# Future-Role Matching & indicative SDG connections

## Profile and data boundaries

Feature 2 reads the same browser-saved profile envelope as Feature 1. Only
explicit saved skill names are sent to the stateless API. A saved draft with a
skill can be compared, with missing required answers shown as prompts. Nothing
is inferred from free-text experience, education, interests or readiness.
Proficiency is self-reported and not weighted. The matcher never modifies the
profile, workbook or imported job records.

## Score and ranking

`matched distinct listed requirements / all distinct listed requirements * 100`

Technical and soft-skill requirements have equal weight. Display is rounded to
one decimal; ranking uses the unrounded ratio. Ties use ascending numeric record
ID. No source requirements means an unavailable score, ranked last. Zero matches
remain visible for inspection, not as positive recommendations.

The existing Skill Gap comparison supplies conservative case/spacing
normalization, explicit aliases, and the workbook's explicit at-least-one
alternatives. It does not equate a broad label such as Programming with Laravel.
Each matched requirement shows the actual profile term responsible. Gaps mean
“not found in the profile,” not “the user lacks the skill.”

The score is an estimated skill-coverage fit, not eligibility, independently
demonstrated competence, a hiring probability, future security or national demand.
Experience and education must be checked separately with the employer. The detail
view additionally compares stated total years with an unambiguous numeric minimum
or the lower end of a range. A shortfall produces a separate warning, never a
score adjustment. Preferred experience, fresh-graduate exceptions, alternative
qualification paths, upper bounds, and non-numeric requirements require manual
comparison. Meeting a number does not verify relevant-domain experience.

## SDG curation

Connections are manually curated interpretations, **not official UN
classifications of jobs**. Each connection carries a rule ID, the specific
source-skill evidence, explicit application conditions, an indicative-mapping
flag, a contribution explanation and the official goal URL.
Role connections are derived from actual source-listed skills, never salary,
employer identity or career category alone.

States are separate:
- **Mapped:** a defensible conditional connection exists.
- **Review required:** assessed, but evidence is insufficient to connect it to a goal.
- **Not assessed:** this wording or profile-only application has not yet been
  evaluated. This is not a warning that human review already found a problem.

The context catalogue uses actual technical requirements, not job titles, to
identify finance, engineering, software, data, marketing, or employment work.
Spreadsheet skills (Excel, MS Excel, Google Sheets), communication, teamwork,
problem-solving, and attention to detail reuse the same family mapping within
each context. For example, spreadsheet validation may enable research analysis
(9.5) or responsible enterprise finance (8.3). The contribution is conditional,
not an inference that an employer conducts socially beneficial work.

Source-listed Data Analytics wording is recognised alongside Data Analysis.
Mapping-only aliases reuse assessed families for source tool spellings such as
MySQL, HTML5, CSS3, GitLab, Next.js, Pandas, ledger/reconciliation and IFRS terms.
These aliases do not alter the independent skill-match formula or canonicalizer;
the original source wording remains the displayed evidence.
Generic workflow support without concrete application evidence is not forced
into a goal (for example, J24's source requirements). J43 remains reviewed:
its listed Excel, Google Sheets, GTM, DNS and PWA tools do not state a specific
research, innovation, or productive-business application, and the acronyms are
not expanded in the source. Its analyst title alone cannot supply that evidence.
Unsupported work-style
traits remain reviewed; unfamiliar catalogue wording stays not assessed.
The catalogue is intentionally incomplete.

| Rule family | Goal / actual target | Conditional rationale |
|---|---|---|
| Human mentoring, teaching and training | [4: Quality Education, 4.4](https://sdgs.un.org/goals/goal4#targets_and_indicators) | Developing relevant employment skills |
| Explicit equal-opportunity practices | [5: Gender Equality, 5.1](https://sdgs.un.org/goals/goal5#targets_and_indicators) | Reducing gender discrimination when applied fairly |
| Recruitment | [8: Decent Work and Economic Growth, 8.5](https://sdgs.un.org/goals/goal8#targets_and_indicators) | Fair access to productive employment |
| Worker protections and workplace practices | [8, 8.8](https://sdgs.un.org/goals/goal8#targets_and_indicators) | Protecting labour rights and safe working environments |
| Enterprise finance and responsible marketing | [8, 8.3](https://sdgs.un.org/goals/goal8#targets_and_indicators) | Supporting productive activities and entrepreneurship |
| Specific technical and engineering capabilities | [9: Industry, Innovation and Infrastructure, 9.5](https://sdgs.un.org/goals/goal9#targets_and_indicators) | Strengthening technological capacity when used for sustainable innovation |
| Asset life, materials and waste practices | [12: Responsible Consumption and Production, 12.5](https://sdgs.un.org/goals/goal12#targets_and_indicators) | Avoiding waste through prevention and reuse |
| Sustainability reporting | [12, 12.6](https://sdgs.un.org/goals/goal12#targets_and_indicators) | Supporting sustainable practices and reporting |
| Spreadsheets, communication, teamwork, problem-solving, attention to detail | Context-dependent [8](https://sdgs.un.org/goals/goal8#targets_and_indicators) or [9](https://sdgs.un.org/goals/goal9#targets_and_indicators) | Enable reliable analysis, technical collaboration, responsible enterprise reporting or fair employment only in a supported work context |

Official goal/target pages were consulted while authoring the rules. These rules
are intentionally incomplete: keyword matching cannot determine actual impact,
work quality, inclusive practices or environmental outcomes. Human review is
required for assessed but ambiguous applications; unassessed wording still needs
catalogue work. Neither state means the user lacks the skill or the job has no
potential contribution.
