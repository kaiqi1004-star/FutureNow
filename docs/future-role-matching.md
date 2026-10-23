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
Experience and education must be checked separately with the employer.

## SDG curation

Connections are manually curated interpretations, **not official UN
classifications of jobs**. Each connection carries a rule ID, the specific
source-skill evidence, a conditional explanation and the official goal URL.
Role connections are derived from actual source-listed skills, never salary,
employer identity or career category alone. A generic or unknown skill is flagged
for review instead of receiving an unrelated tag. Profile-only terms are flagged
until assessed in a work context.

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

Official goal/target pages were consulted while authoring the rules. These rules
are intentionally incomplete: keyword matching cannot determine actual impact,
work quality, inclusive practices or environmental outcomes. Human review is
required for ambiguous or unmapped applications.
