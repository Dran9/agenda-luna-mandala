const crypto = require("node:crypto");

const HASH_PREFIX = "scrypt:v1";
const SALT_BYTES = 16;
const KEY_LENGTH = 32;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024
};

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const value = String(input || "").trim().replace(/-/g, "+").replace(/_/g, "/");

  if (!value) {
    throw new Error("INVALID_BASE64URL");
  }

  const padLength = (4 - (value.length % 4)) % 4;
  return Buffer.from(`${value}${"=".repeat(padLength)}`, "base64");
}

function deriveScryptKey(password, saltBuffer) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, saltBuffer, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseScryptHash(storedHash) {
  const normalized = String(storedHash || "").trim();

  if (!normalized.startsWith(`${HASH_PREFIX}:`)) {
    throw new Error("UNSUPPORTED_HASH_FORMAT");
  }

  const parts = normalized.split(":");

  if (parts.length !== 4) {
    throw new Error("INVALID_HASH_FORMAT");
  }

  const salt = base64UrlDecode(parts[2]);
  const hash = base64UrlDecode(parts[3]);

  if (hash.length !== KEY_LENGTH) {
    throw new Error("INVALID_HASH_LENGTH");
  }

  return {
    salt,
    hash
  };
}

async function hashAdminPassword(password, { salt } = {}) {
  const normalizedPassword = String(password || "");

  if (!normalizedPassword) {
    throw new Error("PASSWORD_REQUIRED");
  }

  const saltBuffer = salt
    ? Buffer.isBuffer(salt)
      ? Buffer.from(salt)
      : base64UrlDecode(salt)
    : crypto.randomBytes(SALT_BYTES);

  const key = await deriveScryptKey(normalizedPassword, saltBuffer);

  return `${HASH_PREFIX}:${base64UrlEncode(saltBuffer)}:${base64UrlEncode(key)}`;
}

async function verifyAdminPassword(password, storedHash, { isProduction = false } = {}) {
  const normalizedPassword = String(password || "");
  const normalizedStoredHash = String(storedHash || "").trim();

  if (!normalizedPassword || !normalizedStoredHash) {
    return { ok: false, reason: "invalid_input" };
  }

  if (normalizedStoredHash.startsWith(`${HASH_PREFIX}:`)) {
    try {
      const { salt, hash } = parseScryptHash(normalizedStoredHash);
      const computed = await deriveScryptKey(normalizedPassword, salt);

      return { ok: safeCompare(computed, hash), reason: "scrypt_v1" };
    } catch {
      return { ok: false, reason: "scrypt_invalid" };
    }
  }

  if (normalizedStoredHash === "dev-only-placeholder-hash") {
    return { ok: normalizedPassword === "dev-only-placeholder-hash", reason: "dev_placeholder" };
  }

  if (normalizedStoredHash.startsWith("plain:")) {
    if (isProduction) {
      return { ok: false, reason: "legacy_plain_blocked" };
    }

    return {
      ok: safeCompare(normalizedPassword, normalizedStoredHash.slice("plain:".length)),
      reason: "legacy_plain"
    };
  }

  if (normalizedStoredHash.startsWith("sha256:")) {
    if (isProduction) {
      return { ok: false, reason: "legacy_sha256_blocked" };
    }

    const digest = crypto.createHash("sha256").update(normalizedPassword, "utf8").digest("hex");
    return {
      ok: safeCompare(digest, normalizedStoredHash.slice("sha256:".length)),
      reason: "legacy_sha256"
    };
  }

  if (isProduction) {
    return { ok: false, reason: "unknown_blocked" };
  }

  return { ok: false, reason: "unknown_format" };
}

module.exports = {
  HASH_PREFIX,
  hashAdminPassword,
  verifyAdminPassword
};
