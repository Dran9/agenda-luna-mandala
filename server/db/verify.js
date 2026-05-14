const { env } = require("../utils/env");
const { createPool } = require("./pool");

const EXPECTED_CORE_TABLES = [
  "centers",
  "center_settings",
  "admin_users",
  "files",
  "services",
  "therapists",
  "therapist_services",
  "rooms",
  "room_features",
  "service_rooms",
  "resource_schedules",
  "resource_blocks",
  "clients",
  "appointments",
  "appointment_resource_claims",
  "payments",
  "wa_messages",
  "scheduled_jobs",
  "round_robin_state",
  "telegram_links",
  "audit_logs",
  "idempotency_keys",
  "schema_migrations"
];

const EXPECTED_TABLE_SET = new Set(EXPECTED_CORE_TABLES);
const OLD_DB_NAME_PATTERN = /(agendaluna|(^|[_-])(prototype|prototipo|legacy|old)([_-]|$))/i;
const REBUILD_DB_NAME_HINT = /(lunamandala|luna[_-]?mandala|v2)/i;
const EXPLICIT_REBUILD_ENV_HINT = /(rebuild|lunamandala|v2)/i;

function assessDbNameSafety(dbName, appEnv = env.APP_ENV) {
  const normalizedName = String(dbName || "").trim();
  const normalizedAppEnv = String(appEnv || "").trim();
  const isEmpty = normalizedName.length === 0;
  const looksLikelyOld = OLD_DB_NAME_PATTERN.test(normalizedName) && !/lunamandala/i.test(normalizedName);
  const looksLikeRebuild = REBUILD_DB_NAME_HINT.test(normalizedName);
  const appEnvLooksRebuild = EXPLICIT_REBUILD_ENV_HINT.test(normalizedAppEnv);

  const errors = [];
  const warnings = [];

  if (isEmpty) {
    errors.push("DB_NAME vacio o no disponible en la conexion actual.");
  }

  if (looksLikelyOld) {
    errors.push("El nombre de DB parece de prototipo/vieja. Se bloquea para evitar escrituras equivocadas.");
  }

  if (!looksLikeRebuild && !appEnvLooksRebuild) {
    errors.push("La DB no parece la nueva del rebuild (falta hint lunamandala/v2 o APP_ENV de rebuild). Se bloquea por seguridad.");
  }

  if (!looksLikeRebuild && appEnvLooksRebuild) {
    errors.push("APP_ENV indica rebuild/v2 pero DB_NAME no coincide con ese contexto. Revisar configuracion antes de continuar.");
  }

  if (looksLikeRebuild && /agendaluna/i.test(normalizedName)) {
    warnings.push("DB_NAME contiene referencias mixtas. Verifica que realmente no sea la DB del prototipo.");
  }

  return {
    dbName: normalizedName,
    appEnv: normalizedAppEnv,
    looksLikelyOld,
    looksLikeRebuild,
    appEnvLooksRebuild,
    errors,
    warnings
  };
}

function inspectSchemaTables(tableNames) {
  const normalized = tableNames.map((tableName) => String(tableName));
  const unknownTables = normalized.filter((tableName) => !EXPECTED_TABLE_SET.has(tableName));
  const missingExpected = EXPECTED_CORE_TABLES.filter((tableName) => !normalized.includes(tableName));

  return {
    tableNames: normalized,
    totalTables: normalized.length,
    hasSchemaMigrations: normalized.includes("schema_migrations"),
    unknownTables,
    missingExpected
  };
}

async function trySetSessionTimezone(connection) {
  try {
    await connection.query("SET time_zone = ?", [env.DB_TIMEZONE]);
    return true;
  } catch (_error) {
    return false;
  }
}

async function fetchDbSnapshot(connection) {
  const [infoRows] = await connection.query(
    `SELECT
      DATABASE() AS databaseName,
      CURRENT_USER() AS currentUser,
      USER() AS sessionUser,
      @@session.time_zone AS sessionTimeZone,
      @@global.time_zone AS globalTimeZone,
      @@system_time_zone AS systemTimeZone`
  );

  const [tableRows] = await connection.query(
    `SELECT table_name AS tableName
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY table_name`
  );

  const tableNames = tableRows.map((row) => row.tableName);
  const schema = inspectSchemaTables(tableNames);

  let migrationVersions = [];

  if (schema.hasSchemaMigrations) {
    const [migrationRows] = await connection.query(
      "SELECT version FROM schema_migrations ORDER BY version"
    );

    migrationVersions = migrationRows.map((row) => row.version);
  }

  return {
    databaseName: infoRows[0]?.databaseName || "",
    currentUser: infoRows[0]?.currentUser || "",
    sessionUser: infoRows[0]?.sessionUser || "",
    sessionTimeZone: infoRows[0]?.sessionTimeZone || "",
    globalTimeZone: infoRows[0]?.globalTimeZone || "",
    systemTimeZone: infoRows[0]?.systemTimeZone || "",
    migrationVersions,
    schema
  };
}

function validatePreflight(snapshot, mode) {
  const errors = [];
  const warnings = [];

  const nameSafety = assessDbNameSafety(snapshot.databaseName, env.APP_ENV);
  errors.push(...nameSafety.errors);
  warnings.push(...nameSafety.warnings);

  const { schema } = snapshot;

  if (mode === "migrate") {
    if (schema.totalTables > 0 && !schema.hasSchemaMigrations) {
      errors.push(
        "La DB no esta vacia y tampoco tiene schema_migrations. Parece esquema incompatible con este rebuild."
      );
    }

    if (schema.unknownTables.length > 0) {
      errors.push(
        `Se detectaron tablas no esperadas para Fase 1: ${schema.unknownTables.join(", ")}. Deteniendo por seguridad.`
      );
    }
  }

  if (mode === "seed" || mode === "verify") {
    if (!schema.hasSchemaMigrations) {
      errors.push("Falta schema_migrations. Ejecuta db:migrate antes de continuar.");
    }

    if (schema.unknownTables.length > 0) {
      errors.push(
        `Se detectaron tablas no esperadas para Fase 1: ${schema.unknownTables.join(", ")}. Deteniendo por seguridad.`
      );
    }

    if (schema.missingExpected.length > 0) {
      errors.push(`Faltan tablas core esperadas: ${schema.missingExpected.join(", ")}.`);
    }

    if (snapshot.migrationVersions.length === 0) {
      errors.push("schema_migrations existe pero no tiene versiones aplicadas.");
    }
  }

  if (mode === "seed" && !snapshot.migrationVersions.includes("0001_core.sql")) {
    errors.push("No se encontro la migracion 0001_core.sql aplicada. Ejecuta db:migrate primero.");
  }

  if (!snapshot.sessionTimeZone) {
    errors.push("No fue posible leer @@session.time_zone.");
  }

  return {
    errors,
    warnings,
    nameSafety
  };
}

function printPreflightSummary(snapshot, validation, mode, timezoneWasSet) {
  console.log(`[db:preflight] modo=${mode}`);
  console.log(`[db:preflight] DB actual: ${snapshot.databaseName}`);
  console.log(`[db:preflight] Usuario DB: ${snapshot.currentUser || snapshot.sessionUser || "desconocido"}`);
  console.log(
    `[db:preflight] Timezone session/global/system: ${snapshot.sessionTimeZone} / ${snapshot.globalTimeZone} / ${snapshot.systemTimeZone}`
  );
  console.log(
    `[db:preflight] Intento SET time_zone(${env.DB_TIMEZONE}): ${timezoneWasSet ? "ok" : "sin permiso o no aplicable"}`
  );

  if (snapshot.schema.totalTables === 0) {
    console.log("[db:preflight] Tablas detectadas: ninguna (DB vacia)");
  } else {
    console.log(`[db:preflight] Tablas detectadas (${snapshot.schema.totalTables}): ${snapshot.schema.tableNames.join(", ")}`);
  }

  if (snapshot.migrationVersions.length > 0) {
    console.log(`[db:preflight] Migraciones aplicadas: ${snapshot.migrationVersions.join(", ")}`);
  }

  if (validation.warnings.length > 0) {
    for (const warning of validation.warnings) {
      console.warn(`[db:preflight] warning: ${warning}`);
    }
  }

  if (validation.errors.length > 0) {
    for (const error of validation.errors) {
      console.error(`[db:preflight] error: ${error}`);
    }
  } else {
    console.log("[db:preflight] Resultado: OK");
  }
}

async function runDbPreflight(connection, { mode = "verify", log = true } = {}) {
  const timezoneWasSet = await trySetSessionTimezone(connection);
  const snapshot = await fetchDbSnapshot(connection);
  const validation = validatePreflight(snapshot, mode);

  if (log) {
    printPreflightSummary(snapshot, validation, mode, timezoneWasSet);
  }

  if (validation.errors.length > 0) {
    const error = new Error("DB preflight failed");
    error.code = "DB_PREFLIGHT_FAILED";
    error.details = {
      mode,
      snapshot,
      validation
    };
    throw error;
  }

  return {
    mode,
    snapshot,
    validation,
    timezoneWasSet
  };
}

async function runDbVerify() {
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    await runDbPreflight(connection, { mode: "verify", log: true });
    console.log("[db:verify] Verificacion completada sin errores.");
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  runDbVerify().catch((error) => {
    console.error(`[db:verify] Fallo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  EXPECTED_CORE_TABLES,
  assessDbNameSafety,
  inspectSchemaTables,
  fetchDbSnapshot,
  runDbPreflight,
  runDbVerify
};
