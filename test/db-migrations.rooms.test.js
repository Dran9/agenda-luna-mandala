const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migrationSql = fs.readFileSync(
  path.resolve(__dirname, "../server/db/migrations/0004_canonical_rooms.sql"),
  "utf8"
);

test("0004 canonical rooms migration applies the four real rooms and disables demo rooms", () => {
  for (const [slug, name] of [
    ["sala-fenix", "Sala Fénix"],
    ["sala-cristales", "Sala Cristales"],
    ["sala-orion", "Sala Orión"],
    ["sala-lakshmi", "Sala Lakshmi"]
  ]) {
    assert.match(migrationSql, new RegExp(`'${slug}'`));
    assert.match(migrationSql, new RegExp(`'${name}'`));
  }

  assert.match(migrationSql, /r\.slug IN \('sala-luna', 'sala-sol', 'sala-aurora'\)/);
  assert.match(migrationSql, /SET r\.is_active = 0/);
});

test("0004 canonical rooms migration connects features, compatibilities, and room schedules", () => {
  assert.match(migrationSql, /INSERT IGNORE INTO room_features/);
  assert.match(migrationSql, /'camilla'/);
  assert.match(migrationSql, /'mesa'/);
  assert.match(migrationSql, /INSERT INTO service_rooms/);
  assert.match(migrationSql, /INSERT INTO resource_schedules/);
  assert.match(migrationSql, /'room'/);
});
