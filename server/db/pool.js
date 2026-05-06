const mysql = require("mysql2/promise");

const { env } = require("../utils/env");

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

function createPool() {
  ensureDbConfig();

  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    waitForConnections: true,
    queueLimit: 0,
    timezone: env.DB_TIMEZONE,
    charset: "utf8mb4",
    multipleStatements: true
  });
}

module.exports = {
  createPool,
  ensureDbConfig
};
