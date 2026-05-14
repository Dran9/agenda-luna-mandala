const mysql = require("mysql2/promise");

const { env } = require("../utils/env");

const RUNTIME_QUEUE_LIMIT = 20;
const RUNTIME_CONNECT_TIMEOUT_MS = 10000;
const RUNTIME_KEEP_ALIVE_DELAY_MS = 10000;

function ensureDbConfig() {
  const missing = [];

  if (!env.DB_HOST) missing.push("DB_HOST");
  if (!env.DB_USER) missing.push("DB_USER");
  if (!env.DB_NAME) missing.push("DB_NAME");

  if (missing.length > 0) {
    const error = new Error(`Missing required DB config: ${missing.join(", ")}`);
    error.code = "DB_CONFIG_MISSING";
    throw error;
  }
}

function createPool(options = {}) {
  ensureDbConfig();

  const {
    multipleStatements = false,
    connectionLimit = env.DB_CONNECTION_LIMIT,
    queueLimit = RUNTIME_QUEUE_LIMIT,
    connectTimeout = RUNTIME_CONNECT_TIMEOUT_MS,
    sessionTimezone = env.DB_TIMEZONE
  } = options;

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit,
    waitForConnections: true,
    queueLimit,
    timezone: env.DB_TIMEZONE,
    charset: "utf8mb4",
    multipleStatements,
    connectTimeout,
    enableKeepAlive: true,
    keepAliveInitialDelay: RUNTIME_KEEP_ALIVE_DELAY_MS
  });

  if (sessionTimezone) {
    pool.on("connection", (connection) => {
      connection.query("SET time_zone = ?", [sessionTimezone]).catch(() => {
        // Connection will be discarded by mysql2 if the SET fails; nothing else to do here.
      });
    });
  }

  return pool;
}

function createMigrationPool() {
  return createPool({
    multipleStatements: true,
    connectionLimit: 1,
    queueLimit: 0
  });
}

let runtimePool = null;

function getRuntimePool() {
  if (!runtimePool) {
    runtimePool = createPool();
  }

  return runtimePool;
}

async function closeRuntimePool() {
  if (!runtimePool) {
    return;
  }

  const pool = runtimePool;
  runtimePool = null;
  await pool.end();
}

module.exports = {
  createPool,
  createMigrationPool,
  ensureDbConfig,
  getRuntimePool,
  closeRuntimePool
};
