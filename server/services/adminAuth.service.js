const { ValidationError } = require("./errors");
const { signToken, verifyToken } = require("../utils/jwt");
const { verifyAdminPassword } = require("../utils/passwordHash");

const DEV_PLACEHOLDER_HASH = "dev-only-placeholder-hash";
const FALLBACK_DEV_JWT_SECRET = "agenda-luna-mandala-admin-dev-secret";
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const ALLOWED_ADMIN_ROLES = new Set(["owner", "admin", "staff"]);

class AdminAuthError extends Error {
  constructor({
    message = "No autorizado",
    code = "ADMIN_UNAUTHORIZED",
    status = 401,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminAuthError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();

  if (!email) {
    throw new ValidationError("email es obligatorio", { field: "email" });
  }

  return email;
}

function normalizePassword(value) {
  const password = String(value || "");

  if (!password) {
    throw new ValidationError("password es obligatorio", { field: "password" });
  }

  return password;
}

function isProductionRuntime({ nodeEnv = process.env.NODE_ENV, appEnv = process.env.APP_ENV } = {}) {
  const normalizedNodeEnv = String(nodeEnv || "").trim().toLowerCase();
  const normalizedAppEnv = String(appEnv || "").trim().toLowerCase();

  return normalizedNodeEnv === "production" || normalizedAppEnv === "production";
}

function resolveJwtSecret({
  jwtSecret = process.env.JWT_SECRET,
  nodeEnv = process.env.NODE_ENV,
  appEnv = process.env.APP_ENV
} = {}) {
  const normalizedSecret = String(jwtSecret || "").trim();

  if (normalizedSecret) {
    return normalizedSecret;
  }

  if (isProductionRuntime({ nodeEnv, appEnv })) {
    throw new AdminAuthError({
      status: 500,
      code: "ADMIN_AUTH_CONFIG_ERROR",
      message: "Configuracion de autenticacion admin incompleta"
    });
  }

  return FALLBACK_DEV_JWT_SECRET;
}

async function validatePassword({ password, passwordHash, isProduction }) {
  if (passwordHash === DEV_PLACEHOLDER_HASH && isProduction) {
    throw new AdminAuthError({
      status: 503,
      code: "ADMIN_AUTH_NOT_READY",
      message: "Admin auth requiere credenciales reales en produccion"
    });
  }

  const result = await verifyAdminPassword(password, passwordHash, { isProduction });

  if (!result.ok && isProduction) {
    if (
      result.reason === "legacy_plain_blocked" ||
      result.reason === "legacy_sha256_blocked" ||
      result.reason === "unknown_blocked"
    ) {
      throw new AdminAuthError({
        status: 503,
        code: "ADMIN_AUTH_NOT_READY",
        message: "Admin auth requiere credenciales reales en produccion"
      });
    }
  }

  return result.ok;
}

async function findAdminByEmail({ connection, email }) {
  const [rows] = await connection.query(
    `SELECT
      id,
      center_id AS centerId,
      email,
      full_name AS fullName,
      password_hash AS passwordHash,
      role,
      is_active AS isActive
     FROM admin_users
     WHERE LOWER(email) = LOWER(?)
       AND is_active = 1
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: Number(rows[0].id),
    centerId: Number(rows[0].centerId),
    email: rows[0].email,
    fullName: rows[0].fullName,
    passwordHash: rows[0].passwordHash,
    role: rows[0].role,
    isActive: Number(rows[0].isActive) === 1
  };
}

async function loginAdmin({
  connection,
  email,
  password,
  now = new Date(),
  tokenTtlSeconds = ADMIN_TOKEN_TTL_SECONDS,
  jwtSecret = process.env.JWT_SECRET,
  nodeEnv = process.env.NODE_ENV,
  appEnv = process.env.APP_ENV
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  const admin = await findAdminByEmail({
    connection,
    email: normalizedEmail
  });

  if (!admin || !admin.isActive) {
    throw new AdminAuthError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciales invalidas"
    });
  }

  const production = isProductionRuntime({ nodeEnv, appEnv });
  const isPasswordValid = await validatePassword({
    password: normalizedPassword,
    passwordHash: admin.passwordHash,
    isProduction: production
  });

  if (!isPasswordValid) {
    throw new AdminAuthError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciales invalidas"
    });
  }

  const issuedAtSeconds = Math.floor((new Date(now).getTime() || Date.now()) / 1000);
  const expiresAtSeconds = issuedAtSeconds + tokenTtlSeconds;
  const secret = resolveJwtSecret({ jwtSecret, nodeEnv, appEnv });

  const token = signToken(
    {
      sub: String(admin.id),
      adminId: admin.id,
      centerId: admin.centerId,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
      iss: "agenda-luna-mandala",
      aud: "admin"
    },
    { secret, now }
  );

  return {
    token,
    admin: {
      id: String(admin.id),
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role
    }
  };
}

function extractBearerToken(authorization) {
  const header = String(authorization || "").trim();

  if (!header) {
    throw new AdminAuthError({
      status: 401,
      code: "ADMIN_TOKEN_REQUIRED",
      message: "Token de admin requerido"
    });
  }

  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AdminAuthError({
      status: 401,
      code: "ADMIN_TOKEN_FORMAT_INVALID",
      message: "Authorization debe usar Bearer token"
    });
  }

  return match[1].trim();
}

function verifyAdminToken({
  authorization,
  now = new Date(),
  jwtSecret = process.env.JWT_SECRET,
  nodeEnv = process.env.NODE_ENV,
  appEnv = process.env.APP_ENV
}) {
  const token = extractBearerToken(authorization);

  let payload;
  try {
    payload = verifyToken(token, {
      secret: resolveJwtSecret({ jwtSecret, nodeEnv, appEnv }),
      now
    });
  } catch (error) {
    throw new AdminAuthError({
      status: 401,
      code: "ADMIN_TOKEN_INVALID",
      message: "Token de admin invalido"
    });
  }

  const adminId = Number.parseInt(payload?.adminId, 10);
  const centerId = Number.parseInt(payload?.centerId, 10);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const role = typeof payload?.role === "string" ? payload.role.trim() : "";
  const isIssuerValid = payload?.iss === "agenda-luna-mandala";
  const isAudienceValid = payload?.aud === "admin";

  if (
    !payload ||
    !isIssuerValid ||
    !isAudienceValid ||
    !Number.isInteger(adminId) ||
    adminId <= 0 ||
    !Number.isInteger(centerId) ||
    centerId <= 0 ||
    !email ||
    !ALLOWED_ADMIN_ROLES.has(role)
  ) {
    throw new AdminAuthError({
      status: 401,
      code: "ADMIN_TOKEN_INVALID",
      message: "Token de admin invalido"
    });
  }

  return {
    adminId,
    centerId,
    email,
    fullName: payload.fullName,
    role,
    tokenPayload: payload
  };
}

module.exports = {
  AdminAuthError,
  loginAdmin,
  verifyAdminToken
};
