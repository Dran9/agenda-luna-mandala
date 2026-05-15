const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PORT = 3000;
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_CONNECTION_LIMIT = 10;

loadDotEnvFile();

function loadDotEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const rawContent = fs.readFileSync(envPath, "utf8");
  const lines = rawContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const isWrapped =
      (value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"));

    if (isWrapped) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function parsePort(rawPort) {
  return parseInteger(rawPort, DEFAULT_PORT);
}

function parseInteger(rawValue, fallback) {
  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function readString(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
}

const env = Object.freeze({
  NODE_ENV: readString(process.env.NODE_ENV, "development"),
  APP_ENV: readString(process.env.APP_ENV, "development"),
  PORT: parsePort(process.env.PORT),
  DB_HOST: readString(process.env.DB_HOST),
  DB_PORT: parseInteger(process.env.DB_PORT, DEFAULT_DB_PORT),
  DB_USER: readString(process.env.DB_USER),
  DB_PASSWORD: readString(process.env.DB_PASSWORD),
  DB_NAME: readString(process.env.DB_NAME),
  DB_CONNECTION_LIMIT: parseInteger(process.env.DB_CONNECTION_LIMIT, DEFAULT_DB_CONNECTION_LIMIT),
  DB_TIMEZONE: readString(process.env.DB_TIMEZONE, "-04:00"),
  APP_TIMEZONE: readString(process.env.APP_TIMEZONE, "America/La_Paz"),
  API_CORS_ORIGINS: readString(process.env.API_CORS_ORIGINS)
});

module.exports = {
  env
};
