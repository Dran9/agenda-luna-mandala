const { Router } = require("express");

const { createPool } = require("../db/pool");
const {
  AdminAppointmentsError,
  getAdminAppointmentDetail,
  listAdminAppointments,
  updateAdminAppointmentStatus
} = require("../services/adminAppointments.service");
const {
  AdminClientsError,
  getAdminClientDetail,
  listAdminClients
} = require("../services/adminClients.service");
const { ValidationError } = require("../services/errors");
const { AdminAuthError, loginAdmin, verifyAdminToken } = require("../services/adminAuth.service");

let sharedPool = null;

function getSharedPool() {
  if (!sharedPool) {
    sharedPool = createPool();
  }

  return sharedPool;
}

function toErrorResponse(error) {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      code: error.code || "VALIDATION_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof AdminAuthError) {
    return {
      status: error.status || 401,
      code: error.code || "ADMIN_UNAUTHORIZED",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof AdminAppointmentsError) {
    return {
      status: error.status || 400,
      code: error.code || "ADMIN_APPOINTMENTS_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof AdminClientsError) {
    return {
      status: error.status || 400,
      code: error.code || "ADMIN_CLIENTS_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  return {
    status: 500,
    code: "ADMIN_ROUTE_ERROR",
    message: "No se pudo procesar la solicitud de admin",
    details: {}
  };
}

function readAuthorizationHeader(req) {
  if (typeof req.get === "function") {
    return req.get("Authorization");
  }

  const headers = req.headers || {};
  return headers.authorization || headers.Authorization;
}

function writeErrorResponse(res, error) {
  const mapped = toErrorResponse(error);
  res.status(mapped.status).json({
    error: {
      code: mapped.code,
      message: mapped.message,
      details: mapped.details
    }
  });
}

function authenticateAdmin(req, res, verifyToken) {
  try {
    return verifyToken({
      authorization: readAuthorizationHeader(req),
      now: new Date()
    });
  } catch (error) {
    writeErrorResponse(res, error);
    return null;
  }
}

function createAdminRouter({
  getPool = getSharedPool,
  listAppointments = listAdminAppointments,
  getAppointmentById = getAdminAppointmentDetail,
  setAppointmentStatus = updateAdminAppointmentStatus,
  listClients = listAdminClients,
  getClientById = getAdminClientDetail,
  login = loginAdmin,
  verifyToken = verifyAdminToken
} = {}) {
  const router = Router();

  async function withConnection(res, handler) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await handler(connection);
    } catch (error) {
      writeErrorResponse(res, error);
    } finally {
      connection.release();
    }
  }

  router.post("/auth/login", async (req, res) => {
    await withConnection(res, async (connection) => {
      const payload = await login({
        connection,
        email: req.body?.email,
        password: req.body?.password,
        now: new Date()
      });

      res.status(200).json(payload);
    });
  });

  router.get("/appointments", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await listAppointments({
        connection,
        tenantSlug: req.query.tenantSlug,
        date: req.query.date,
        upcoming: req.query.upcoming,
        limit: req.query.limit,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.get("/appointments/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await getAppointmentById({
        connection,
        appointmentId: req.params.id,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.post("/appointments/:id/status", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await setAppointmentStatus({
        connection,
        appointmentId: req.params.id,
        status: req.body?.status,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.get("/clients", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await listClients({
        connection,
        tenantSlug: req.query.tenantSlug,
        q: req.query.q,
        onboarding: req.query.onboarding,
        limit: req.query.limit,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.get("/clients/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await getClientById({
        connection,
        tenantSlug: req.query.tenantSlug,
        clientId: req.params.id,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  return router;
}

const adminRoute = createAdminRouter();

module.exports = {
  createAdminRouter,
  adminRoute
};
