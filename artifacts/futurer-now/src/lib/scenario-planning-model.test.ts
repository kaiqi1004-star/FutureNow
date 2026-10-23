import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adoptionScenarios,
  getScenarioForId,
  scenarioCategoryLabels,
  scenarioResearchSources,
  taskIllustrationDisclosure,
  taskIllustrationsBySector,
} from "./scenario-planning-model.ts";

test("both adoption scenarios are distinct qualitative planning cases, not numerical forecasts", () => {
  const moderate = getScenarioForId("moderate");
  const fast = getScenarioForId("fast");

  assert.notEqual(moderate.id, fast.id);
  assert.notEqual(moderate.paceLabel, fast.paceLabel);
  assert.notEqual(moderate.summary, fast.summary);
  assert.equal(adoptionScenarios.length, 2);
  assert.doesNotMatch(JSON.stringify(adoptionScenarios), /\b\d+(?:\.\d+)?%/);
  assert.ok(adoptionScenarios.every((scenario) =>
    scenario.assumptions.length > 0 &&
    scenario.taskChanges.automation &&
    scenario.taskChanges.assistance &&
    scenario.taskChanges.humanInvolvement &&
    scenario.opportunities.length > 0 &&
    scenario.challenges.length > 0 &&
    scenario.preparationActions.length > 0,
  ));
});

test("all scenario evidence links resolve to verified source metadata with original URLs", () => {
  assert.deepEqual(
    scenarioResearchSources.map((source) => source.id),
    ["world-bank-2026", "ilo-2025", "wef-2025"],
  );
  for (const source of scenarioResearchSources) {
    assert.match(source.originalUrl, /^https:\/\/(documents1\.worldbank\.org|www\.ilo\.org|www\.weforum\.org)\//);
    assert.ok(source.title.length > 10);
    assert.ok(source.publisher.length > 3);
    assert.ok(source.publishedOn.length > 3);
    assert.ok(source.finding.length > 30);
    assert.ok(source.methodology.length > 30);
    assert.equal(source.verifiedOn, "2026-10-24");
  }
  for (const scenario of adoptionScenarios) {
    const statements = [
      ...scenario.assumptions,
      ...Object.values(scenario.taskChanges),
      ...scenario.opportunities,
      ...scenario.challenges,
      ...scenario.skillImplications,
      ...scenario.preparationActions,
    ];
    for (const statement of statements) {
      for (const id of statement.sourceIds) {
        assert.ok(scenarioResearchSources.some((source) => source.id === id), `${id} must identify a displayed source`);
      }
      if (statement.evidenceType === "planning-assumption") {
        assert.ok(/assumption|hypothetical|scenario/i.test(statement.text));
      }
    }
  }
});

test("six supplied job categories have clearly disclosed illustrative task prompts", () => {
  const categories = Object.keys(scenarioCategoryLabels).sort();
  assert.deepEqual(Object.keys(taskIllustrationsBySector).sort(), categories);
  assert.equal(categories.length, 6);
  assert.match(taskIllustrationDisclosure, /Illustrative planning examples only/);
  assert.match(taskIllustrationDisclosure, /not verified daily duties/);
  for (const example of Object.values(taskIllustrationsBySector)) {
    assert.ok(example.automation.length > 20);
    assert.ok(example.assistance.length > 20);
    assert.ok(example.humanInvolvement.length > 20);
  }
});
