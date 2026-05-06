const assert = require("node:assert/strict");
const test = require("node:test");

const { assessDbNameSafety, inspectSchemaTables, EXPECTED_CORE_TABLES } = require("../server/db/verify");

test("assessDbNameSafety blocks obvious prototype db names", () => {
  const result = assessDbNameSafety("u123456789_agendaluna", "development");

  assert.equal(result.looksLikelyOld, true);
  assert.ok(result.errors.length > 0);
});

test("assessDbNameSafety accepts luna mandala v2 db names", () => {
  const result = assessDbNameSafety("u926460478_lunamandala_v2", "production");

  assert.equal(result.looksLikeRebuild, true);
  assert.equal(result.errors.length, 0);
});

test("inspectSchemaTables detects unknown and missing tables", () => {
  const sampleTables = ["centers", "schema_migrations", "legacy_table"];
  const inspection = inspectSchemaTables(sampleTables);

  assert.deepEqual(inspection.unknownTables, ["legacy_table"]);
  assert.ok(inspection.missingExpected.length > 0);
  assert.equal(inspection.hasSchemaMigrations, true);
});

test("inspectSchemaTables returns no missing tables when schema is complete", () => {
  const inspection = inspectSchemaTables(EXPECTED_CORE_TABLES);

  assert.deepEqual(inspection.unknownTables, []);
  assert.deepEqual(inspection.missingExpected, []);
});
