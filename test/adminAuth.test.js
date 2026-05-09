const assert = require("node:assert/strict");
const test = require("node:test");

const { ValidationError } = require("../server/services/errors");
const {
  AdminAuthError,
  loginAdmin,
  verifyAdminToken
} = require("../server/services/adminAuth.service");
const { hashAdminPassword } = require("../server/utils/passwordHash");
const { signToken } = require("../server/utils/jwt");

function createAuthConnection({ admins }) {
  return {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (normalized.includes("FROM admin_users") && normalized.includes("LOWER(email) = LOWER(?)")) {
        const [email] = params;
        const row = admins.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase());

        if (!row) {
          return [[]];
        }

        return [[{
          id: row.id,
          centerId: row.centerId,
          email: row.email,
          fullName: row.fullName,
          passwordHash: row.passwordHash,
          role: row.role,
          isActive: row.isActive ? 1 : 0
        }]];
      }

      throw new Error(`Query no soportada en test: ${normalized}`);
    }
  };
}

test("login dev con dev-only-placeholder-hash funciona en no-production", async () => {
  const connection = createAuthConnection({
    admins: [
      {
        id: 7,
        centerId: 1,
        email: "admin.dev@lunamandala.local",
        fullName: "Admin Dev Luna",
        passwordHash: "dev-only-placeholder-hash",
        role: "owner",
        isActive: true
      }
    ]
  });

  const result = await loginAdmin({
    connection,
    email: "admin.dev@lunamandala.local",
    password: "dev-only-placeholder-hash",
    now: new Date("2026-05-08T22:00:00.000Z"),
    jwtSecret: "secret-test",
    nodeEnv: "development",
    appEnv: "development"
  });

  assert.equal(typeof result.token, "string");
  assert.equal(result.admin.id, "7");

  const session = verifyAdminToken({
    authorization: `Bearer ${result.token}`,
    now: new Date("2026-05-08T22:01:00.000Z"),
    jwtSecret: "secret-test",
    nodeEnv: "development",
    appEnv: "development"
  });

  assert.equal(session.adminId, 7);
});

test("login production con dev-only-placeholder-hash devuelve 503 ADMIN_AUTH_NOT_READY", async () => {
  const connection = createAuthConnection({
    admins: [
      {
        id: 7,
        centerId: 1,
        email: "admin.dev@lunamandala.local",
        fullName: "Admin Dev Luna",
        passwordHash: "dev-only-placeholder-hash",
        role: "owner",
        isActive: true
      }
    ]
  });

  await assert.rejects(
    loginAdmin({
      connection,
      email: "admin.dev@lunamandala.local",
      password: "dev-only-placeholder-hash",
      jwtSecret: "secret-test",
      nodeEnv: "production",
      appEnv: "production"
    }),
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_AUTH_NOT_READY");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

test("login production con hash scrypt:v1 valido devuelve token", async () => {
  const storedHash = await hashAdminPassword("password-seguro-123");

  const connection = createAuthConnection({
    admins: [
      {
        id: 9,
        centerId: 1,
        email: "owner@lunamandala.local",
        fullName: "Owner Real",
        passwordHash: storedHash,
        role: "owner",
        isActive: true
      }
    ]
  });

  const result = await loginAdmin({
    connection,
    email: "owner@lunamandala.local",
    password: "password-seguro-123",
    jwtSecret: "secret-test",
    nodeEnv: "production",
    appEnv: "production"
  });

  assert.equal(typeof result.token, "string");
  assert.equal(result.admin.id, "9");
});

test("login production con password incorrecto devuelve 401 INVALID_CREDENTIALS", async () => {
  const storedHash = await hashAdminPassword("password-correcto");

  const connection = createAuthConnection({
    admins: [
      {
        id: 9,
        centerId: 1,
        email: "owner@lunamandala.local",
        fullName: "Owner Real",
        passwordHash: storedHash,
        role: "owner",
        isActive: true
      }
    ]
  });

  await assert.rejects(
    loginAdmin({
      connection,
      email: "owner@lunamandala.local",
      password: "password-incorrecto",
      jwtSecret: "secret-test",
      nodeEnv: "production",
      appEnv: "production"
    }),
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "INVALID_CREDENTIALS");
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("production no acepta plain:*", async () => {
  const connection = createAuthConnection({
    admins: [
      {
        id: 10,
        centerId: 1,
        email: "legacy-plain@lunamandala.local",
        fullName: "Legacy Plain",
        passwordHash: "plain:123456",
        role: "admin",
        isActive: true
      }
    ]
  });

  await assert.rejects(
    loginAdmin({
      connection,
      email: "legacy-plain@lunamandala.local",
      password: "123456",
      jwtSecret: "secret-test",
      nodeEnv: "production",
      appEnv: "production"
    }),
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_AUTH_NOT_READY");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

test("production no acepta sha256:*", async () => {
  const connection = createAuthConnection({
    admins: [
      {
        id: 11,
        centerId: 1,
        email: "legacy-sha@lunamandala.local",
        fullName: "Legacy Sha",
        passwordHash: "sha256:dummyhash",
        role: "admin",
        isActive: true
      }
    ]
  });

  await assert.rejects(
    loginAdmin({
      connection,
      email: "legacy-sha@lunamandala.local",
      password: "123456",
      jwtSecret: "secret-test",
      nodeEnv: "production",
      appEnv: "production"
    }),
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_AUTH_NOT_READY");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

test("login admin con credenciales vacias devuelve ValidationError", async () => {
  const connection = createAuthConnection({ admins: [] });

  await assert.rejects(
    loginAdmin({
      connection,
      email: "",
      password: "",
      jwtSecret: "secret-test",
      nodeEnv: "development",
      appEnv: "development"
    }),
    (error) => {
      assert.equal(error instanceof ValidationError, true);
      return true;
    }
  );
});

test("verifyAdminToken requiere Bearer token valido", () => {
  assert.throws(
    () => {
      verifyAdminToken({
        authorization: "",
        jwtSecret: "secret-test",
        nodeEnv: "development",
        appEnv: "development"
      });
    },
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_TOKEN_REQUIRED");
      return true;
    }
  );

  assert.throws(
    () => {
      verifyAdminToken({
        authorization: "Bearer invalid.token.value",
        jwtSecret: "secret-test",
        nodeEnv: "development",
        appEnv: "development"
      });
    },
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_TOKEN_INVALID");
      return true;
    }
  );
});

test("verifyAdminToken rechaza token con iss o aud incorrecto", () => {
  const secret = "secret-test";
  const basePayload = {
    sub: "1",
    adminId: 1,
    centerId: 1,
    email: "admin@lunamandala.local",
    fullName: "Admin",
    role: "owner",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const invalidIssToken = signToken(
    {
      ...basePayload,
      iss: "otro-emisor",
      aud: "admin"
    },
    { secret }
  );

  const invalidAudToken = signToken(
    {
      ...basePayload,
      iss: "agenda-luna-mandala",
      aud: "otro-aud"
    },
    { secret }
  );

  assert.throws(
    () => {
      verifyAdminToken({
        authorization: `Bearer ${invalidIssToken}`,
        jwtSecret: secret,
        nodeEnv: "development",
        appEnv: "development"
      });
    },
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_TOKEN_INVALID");
      return true;
    }
  );

  assert.throws(
    () => {
      verifyAdminToken({
        authorization: `Bearer ${invalidAudToken}`,
        jwtSecret: secret,
        nodeEnv: "development",
        appEnv: "development"
      });
    },
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_TOKEN_INVALID");
      return true;
    }
  );
});

test("verifyAdminToken rechaza centerId y adminId invalidos", () => {
  const secret = "secret-test";
  const invalidIdsToken = signToken(
    {
      sub: "1",
      adminId: 0,
      centerId: -2,
      email: "admin@lunamandala.local",
      fullName: "Admin",
      role: "owner",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: "agenda-luna-mandala",
      aud: "admin"
    },
    { secret }
  );

  assert.throws(
    () => {
      verifyAdminToken({
        authorization: `Bearer ${invalidIdsToken}`,
        jwtSecret: secret,
        nodeEnv: "development",
        appEnv: "development"
      });
    },
    (error) => {
      assert.equal(error instanceof AdminAuthError, true);
      assert.equal(error.code, "ADMIN_TOKEN_INVALID");
      return true;
    }
  );
});

test("verifyAdminToken acepta token admin valido", () => {
  const secret = "secret-test";
  const validToken = signToken(
    {
      sub: "5",
      adminId: 5,
      centerId: 1,
      email: "owner@lunamandala.local",
      fullName: "Owner Real",
      role: "owner",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: "agenda-luna-mandala",
      aud: "admin"
    },
    { secret }
  );

  const session = verifyAdminToken({
    authorization: `Bearer ${validToken}`,
    jwtSecret: secret,
    nodeEnv: "development",
    appEnv: "development"
  });

  assert.equal(session.adminId, 5);
  assert.equal(session.centerId, 1);
  assert.equal(session.email, "owner@lunamandala.local");
  assert.equal(session.role, "owner");
});
