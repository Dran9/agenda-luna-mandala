const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { createPool } = require("./pool");
const { runDbPreflight } = require("./verify");

const MIGRATIONS_DIR = path.resolve(__dirname, "migrations");

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
}

function checksumSql(sql) {
  return crypto.createHash("sha256").update(sql, "utf8").digest("hex");
}

async function ensureSchemaMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      version VARCHAR(128) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query("SELECT version FROM schema_migrations ORDER BY version");
  return new Set(rows.map((row) => row.version));
}

async function applyMigration(connection, migrationFileName) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFileName);
  const sql = fs.readFileSync(migrationPath, "utf8").trim();

  if (!sql) {
    console.log(`[db:migrate] ${migrationFileName} vacia, se omite.`);
    return;
  }

  const checksum = checksumSql(sql);

  await connection.beginTransaction();

  try {
    await connection.query(sql);
    await connection.query(
      "INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)",
      [migrationFileName, checksum]
    );
    await connection.commit();
    console.log(`[db:migrate] Aplicada ${migrationFileName}`);
  } catch (error) {
    await connection.rollback();
    throw new Error(`Fallo en migracion ${migrationFileName}: ${error.message}`);
  }
}

async function runMigrations() {
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    await runDbPreflight(connection, { mode: "migrate", log: true });
    await ensureSchemaMigrationsTable(connection);

    const applied = await getAppliedMigrations(connection);
    const files = getMigrationFiles();

    if (files.length === 0) {
      console.log("[db:migrate] No hay migraciones SQL para ejecutar.");
      return;
    }

    for (const migrationFileName of files) {
      if (applied.has(migrationFileName)) {
        console.log(`[db:migrate] ${migrationFileName} ya aplicada, se omite.`);
        continue;
      }

      await applyMigration(connection, migrationFileName);
    }

    console.log("[db:migrate] Migraciones completadas.");
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error(`[db:migrate] Fallo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  runMigrations
};
