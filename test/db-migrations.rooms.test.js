const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migrationSql = fs.readFileSync(
  path.resolve(__dirname, "../server/db/migrations/0004_canonical_rooms.sql"),
  "utf8"
);
const serviceRequirementsMigrationSql = fs.readFileSync(
  path.resolve(__dirname, "../server/db/migrations/0005_service_room_requirements.sql"),
  "utf8"
);
const paymentManualMigrationSql = fs.readFileSync(
  path.resolve(__dirname, "../server/db/migrations/0006_payment_c0_manual_schema.sql"),
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

test("0005 service room requirements stores required room resources by service", () => {
  assert.match(serviceRequirementsMigrationSql, /CREATE TABLE IF NOT EXISTS service_room_requirements/);
  assert.match(serviceRequirementsMigrationSql, /PRIMARY KEY \(center_id, service_id, feature_key\)/);
  assert.match(serviceRequirementsMigrationSql, /FOREIGN KEY \(service_id\) REFERENCES services\(id\)/);
  assert.match(serviceRequirementsMigrationSql, /INSERT INTO service_room_requirements/);
  assert.match(serviceRequirementsMigrationSql, /'mesa'/);
  assert.match(serviceRequirementsMigrationSql, /'camilla'/);
});

test("0006 payment C0 schema puts arancel on therapist_services", () => {
  assert.match(paymentManualMigrationSql, /ALTER TABLE therapist_services/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN price_amount DECIMAL\(10,2\) NOT NULL DEFAULT 0/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN currency_code CHAR\(3\) NOT NULL DEFAULT 'BOB'/);
  assert.match(paymentManualMigrationSql, /UPDATE therapist_services ts/);
  assert.match(paymentManualMigrationSql, /INNER JOIN services s/);
});

test("0006 payment C0 schema adds manual payment reference timestamps", () => {
  assert.match(paymentManualMigrationSql, /ALTER TABLE payments/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN reference VARCHAR\(180\) NULL/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN submitted_at DATETIME NULL/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN approved_at DATETIME NULL/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN rejected_at DATETIME NULL/);
  assert.match(paymentManualMigrationSql, /ADD COLUMN canceled_at DATETIME NULL/);
});
