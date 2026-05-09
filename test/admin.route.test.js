const assert = require("node:assert/strict");
const test = require("node:test");

const { createAdminRouter } = require("../server/routes/admin.route");
const { AdminAppointmentsError } = require("../server/services/adminAppointments.service");
const { AdminAuthError, verifyAdminToken } = require("../server/services/adminAuth.service");
const { ValidationError } = require("../server/services/errors");
const { signToken } = require("../server/utils/jwt");

function createResponseMock() {
  return {
    statusCode: undefined,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

function getRouteHandler(router, path, method) {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  if (!layer) {
    throw new Error(`${method.toUpperCase()} ${path} no encontrado`);
  }

  return layer.route.stack[0].handle;
}

test("POST /api/admin/auth/login returns token and admin profile", async () => {
  const connection = {
    released: false,
    release() {
      this.released = true;
    }
  };
  const pool = {
    async getConnection() {
      return connection;
    }
  };

  let receivedLoginPayload = null;

  const router = createAdminRouter({
    getPool: () => pool,
    login: async (payload) => {
      receivedLoginPayload = payload;
      return {
        token: "token-demo",
        admin: {
          id: "1",
          email: "admin.dev@lunamandala.local",
          fullName: "Admin Dev",
          role: "owner"
        }
      };
    }
  });

  const handler = getRouteHandler(router, "/auth/login", "post");
  const req = {
    body: {
      email: "admin.dev@lunamandala.local",
      password: "dev-only-placeholder-hash"
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(connection.released, true);
  assert.equal(receivedLoginPayload.email, "admin.dev@lunamandala.local");
  assert.equal(receivedLoginPayload.password, "dev-only-placeholder-hash");
  assert.equal(receivedLoginPayload.now instanceof Date, true);
  assert.equal(res.payload.token, "token-demo");
  assert.equal(res.payload.admin.role, "owner");
});

test("POST /api/admin/auth/login ignora body.now enviado por cliente", async () => {
  const connection = {
    release() {}
  };
  const pool = {
    async getConnection() {
      return connection;
    }
  };

  let receivedLoginPayload = null;

  const router = createAdminRouter({
    getPool: () => pool,
    login: async (payload) => {
      receivedLoginPayload = payload;
      return {
        token: "token-demo",
        admin: {
          id: "1",
          email: "admin.dev@lunamandala.local",
          fullName: "Admin Dev",
          role: "owner"
        }
      };
    }
  });

  const handler = getRouteHandler(router, "/auth/login", "post");
  const req = {
    body: {
      email: "admin.dev@lunamandala.local",
      password: "dev-only-placeholder-hash",
      now: "2999-01-01T00:00:00.000Z"
    }
  };
  const res = createResponseMock();

  const before = Date.now();
  await handler(req, res);
  const after = Date.now();

  assert.equal(res.statusCode, 200);
  assert.equal(receivedLoginPayload.now instanceof Date, true);
  const nowTime = receivedLoginPayload.now.getTime();
  assert.equal(nowTime >= before && nowTime <= after + 5000, true);
});

test("GET /api/admin/appointments without token returns 401", async () => {
  let requestedConnection = false;

  const pool = {
    async getConnection() {
      requestedConnection = true;
      return {
        release() {}
      };
    }
  };

  const router = createAdminRouter({
    getPool: () => pool
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {},
    get() {
      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, "ADMIN_TOKEN_REQUIRED");
  assert.equal(requestedConnection, false);
});

test("GET /api/admin/appointments ignora query.now y no revive token expirado", async () => {
  let requestedConnection = false;

  const pool = {
    async getConnection() {
      requestedConnection = true;
      return {
        release() {}
      };
    }
  };

  const secret = "route-test-secret";
  const token = signToken(
    {
      sub: "1",
      adminId: 1,
      centerId: 1,
      email: "admin.dev@lunamandala.local",
      fullName: "Admin Dev",
      role: "owner",
      iat: 100,
      exp: 101,
      iss: "agenda-luna-mandala",
      aud: "admin"
    },
    { secret }
  );

  const router = createAdminRouter({
    getPool: () => pool,
    verifyToken: ({ authorization, now }) =>
      verifyAdminToken({
        authorization,
        now,
        jwtSecret: secret,
        nodeEnv: "development",
        appEnv: "development"
      })
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {
      now: "1970-01-01T00:01:40.000Z"
    },
    get(headerName) {
      if (headerName === "Authorization") {
        return `Bearer ${token}`;
      }

      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, "ADMIN_TOKEN_INVALID");
  assert.equal(requestedConnection, false);
});

test("GET /api/admin/appointments with token returns read-only dashboard payload", async () => {
  const connection = {
    released: false,
    release() {
      this.released = true;
    }
  };
  const pool = {
    async getConnection() {
      return connection;
    }
  };

  let receivedArgs = null;

  const router = createAdminRouter({
    getPool: () => pool,
    verifyToken: () => ({ adminId: 1, centerId: 1, email: "admin.dev@lunamandala.local", role: "owner" }),
    listAppointments: async (args) => {
      receivedArgs = args;

      return {
        generatedAt: "2026-05-08T12:00:00.000Z",
        center: { id: 1, slug: "demo", displayName: "Luna Mandala", timezone: "America/La_Paz" },
        filters: { date: "2026-05-08", upcoming: true, limit: 20 },
        summary: { pending: 1, confirmed: 2, cancelled: 0, completed: 0, no_show: 0, total: 3 },
        today: [],
        upcoming: [],
        recentCreated: []
      };
    }
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {
      tenantSlug: "demo",
      date: "today",
      upcoming: "1",
      limit: "20"
    },
    get(headerName) {
      if (headerName === "Authorization") {
        return "Bearer token-demo";
      }

      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(connection.released, true);
  assert.equal(receivedArgs.tenantSlug, "demo");
  assert.equal(receivedArgs.date, "today");
  assert.equal(receivedArgs.upcoming, "1");
  assert.equal(receivedArgs.limit, "20");
  assert.equal(receivedArgs.now instanceof Date, true);
  assert.deepEqual(receivedArgs.adminSession, {
    adminId: 1,
    centerId: 1,
    email: "admin.dev@lunamandala.local",
    role: "owner"
  });
  assert.equal(Array.isArray(res.payload.today), true);
  assert.equal(Array.isArray(res.payload.upcoming), true);
});

test("GET /api/admin/appointments maps ValidationError to 400", async () => {
  const connection = {
    release() {}
  };
  const pool = {
    async getConnection() {
      return connection;
    }
  };

  const router = createAdminRouter({
    getPool: () => pool,
    verifyToken: () => ({ adminId: 1, centerId: 1, email: "admin.dev@lunamandala.local", role: "owner" }),
    listAppointments: async () => {
      throw new ValidationError("limit invalido", { field: "limit" });
    }
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {},
    get() {
      return "Bearer token-demo";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.code, "VALIDATION_ERROR");
  assert.equal(res.payload.error.details.field, "limit");
});

test("GET /api/admin/appointments maps auth error to 401", async () => {
  const router = createAdminRouter({
    verifyToken: () => {
      throw new AdminAuthError({
        status: 401,
        code: "ADMIN_TOKEN_INVALID",
        message: "Token invalido"
      });
    }
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {},
    get() {
      return "Bearer bad-token";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, "ADMIN_TOKEN_INVALID");
});

test("GET /api/admin/appointments maps unexpected errors to 500", async () => {
  const connection = {
    release() {}
  };
  const pool = {
    async getConnection() {
      return connection;
    }
  };

  const router = createAdminRouter({
    getPool: () => pool,
    verifyToken: () => ({ adminId: 1, centerId: 1, email: "admin.dev@lunamandala.local", role: "owner" }),
    listAppointments: async () => {
      throw new Error("boom");
    }
  });

  const handler = getRouteHandler(router, "/appointments", "get");
  const req = {
    query: {},
    get() {
      return "Bearer token-demo";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.error.code, "ADMIN_ROUTE_ERROR");
});

test("GET /api/admin/appointments/:id without token returns 401", async () => {
  let requestedConnection = false;

  const pool = {
    async getConnection() {
      requestedConnection = true;
      return {
        release() {}
      };
    }
  };

  const router = createAdminRouter({
    getPool: () => pool
  });

  const handler = getRouteHandler(router, "/appointments/:id", "get");
  const req = {
    params: { id: "10" },
    get() {
      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, "ADMIN_TOKEN_REQUIRED");
  assert.equal(requestedConnection, false);
});

test("GET /api/admin/appointments/:id with token returns appointment detail", async () => {
  const connection = {
    released: false,
    release() {
      this.released = true;
    }
  };

  let receivedArgs = null;

  const router = createAdminRouter({
    getPool: () => ({
      async getConnection() {
        return connection;
      }
    }),
    verifyToken: () => ({ adminId: 9, centerId: 3, email: "owner@luna.com", role: "owner" }),
    getAppointmentById: async (args) => {
      receivedArgs = args;

      return {
        generatedAt: "2026-05-09T03:00:00.000Z",
        center: { id: 3, slug: "luna", displayName: "Luna", timezone: "America/La_Paz" },
        appointment: { id: 10, publicCode: "PUB-TEST-10", status: "confirmed", payments: [], claims: [] }
      };
    }
  });

  const handler = getRouteHandler(router, "/appointments/:id", "get");
  const req = {
    params: { id: "10" },
    get(headerName) {
      if (headerName === "Authorization") {
        return "Bearer token-demo";
      }

      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(connection.released, true);
  assert.equal(receivedArgs.appointmentId, "10");
  assert.equal(receivedArgs.now instanceof Date, true);
  assert.equal(receivedArgs.adminSession.centerId, 3);
  assert.equal(res.payload.appointment.id, 10);
});

test("GET /api/admin/appointments/:id returns 404 for missing appointment", async () => {
  const connection = {
    release() {}
  };

  const router = createAdminRouter({
    getPool: () => ({
      async getConnection() {
        return connection;
      }
    }),
    verifyToken: () => ({ adminId: 9, centerId: 3, email: "owner@luna.com", role: "owner" }),
    getAppointmentById: async () => {
      throw new AdminAppointmentsError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "Cita no encontrada"
      });
    }
  });

  const handler = getRouteHandler(router, "/appointments/:id", "get");
  const req = {
    params: { id: "9999" },
    get() {
      return "Bearer token-demo";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error.code, "APPOINTMENT_NOT_FOUND");
});

test("POST /api/admin/appointments/:id/status applies valid transition", async () => {
  const connection = {
    release() {}
  };

  let receivedArgs = null;

  const router = createAdminRouter({
    getPool: () => ({
      async getConnection() {
        return connection;
      }
    }),
    verifyToken: () => ({ adminId: 2, centerId: 1, email: "admin@luna.com", role: "admin" }),
    setAppointmentStatus: async (args) => {
      receivedArgs = args;

      return {
        transition: { from: "pending", to: "confirmed" },
        appointment: { id: 88, status: "confirmed" }
      };
    }
  });

  const handler = getRouteHandler(router, "/appointments/:id/status", "post");
  const req = {
    params: { id: "88" },
    body: { status: "confirmed" },
    get() {
      return "Bearer token-demo";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(receivedArgs.appointmentId, "88");
  assert.equal(receivedArgs.status, "confirmed");
  assert.equal(receivedArgs.now instanceof Date, true);
  assert.equal(receivedArgs.adminSession.role, "admin");
  assert.equal(res.payload.appointment.status, "confirmed");
});

test("POST /api/admin/appointments/:id/status without token returns 401 y no pide conexion", async () => {
  let requestedConnection = false;

  const pool = {
    async getConnection() {
      requestedConnection = true;
      return {
        release() {}
      };
    }
  };

  const router = createAdminRouter({
    getPool: () => pool
  });

  const handler = getRouteHandler(router, "/appointments/:id/status", "post");
  const req = {
    params: { id: "88" },
    body: { status: "confirmed" },
    get() {
      return undefined;
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error.code, "ADMIN_TOKEN_REQUIRED");
  assert.equal(requestedConnection, false);
});

test("POST /api/admin/appointments/:id/status returns 409 on invalid transition", async () => {
  const connection = {
    release() {}
  };

  const router = createAdminRouter({
    getPool: () => ({
      async getConnection() {
        return connection;
      }
    }),
    verifyToken: () => ({ adminId: 2, centerId: 1, email: "admin@luna.com", role: "admin" }),
    setAppointmentStatus: async () => {
      throw new AdminAppointmentsError({
        status: 409,
        code: "APPOINTMENT_STATUS_TRANSITION_INVALID",
        message: "Transicion de estado no permitida"
      });
    }
  });

  const handler = getRouteHandler(router, "/appointments/:id/status", "post");
  const req = {
    params: { id: "88" },
    body: { status: "pending" },
    get() {
      return "Bearer token-demo";
    }
  };
  const res = createResponseMock();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error.code, "APPOINTMENT_STATUS_TRANSITION_INVALID");
});
