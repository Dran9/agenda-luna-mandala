const { Router } = require("express");

const { createPool } = require("../db/pool");
const {
  AdminAppointmentsError,
  createAdminManualAppointment,
  deleteAdminAppointments,
  getAdminAppointmentDetail,
  listAdminAppointmentHistory,
  listAdminAppointments,
  updateAdminAppointmentRoom,
  updateAdminAppointmentStatus
} = require("../services/adminAppointments.service");
const {
  AdminClientsError,
  deleteAdminClients,
  getAdminClientDetail,
  listAdminClients
} = require("../services/adminClients.service");
const {
  AdminTherapistsError,
  createAdminTherapist,
  getAdminTherapistDetail,
  listAdminTherapists,
  updateAdminTherapistAvailability,
  updateAdminTherapistProfile,
  updateAdminTherapistService
} = require("../services/adminTherapists.service");
const {
  AdminResourcesError,
  createRoom,
  createService,
  listAdminResources,
  updateService,
  updateServiceRoomCompatibility,
  updateRoom
} = require("../services/adminResources.service");
const { searchAdmin } = require("../services/adminSearch.service");
const { PublicBookingError, SlotOccupiedError, ValidationError } = require("../services/errors");
const { AdminAuthError, loginAdmin, verifyAdminToken } = require("../services/adminAuth.service");
const { env } = require("../utils/env");

let sharedPool = null;
const SESSION_TIMEZONE = env.DB_TIMEZONE || "-04:00";

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

  if (error instanceof PublicBookingError) {
    return {
      status: error.status || 400,
      code: error.code || "PUBLIC_BOOKING_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof SlotOccupiedError || error?.code === "SLOT_OCCUPIED") {
    return {
      status: 409,
      code: error.code || "SLOT_OCCUPIED",
      message: error.message || "El slot ya no esta disponible",
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

  if (error instanceof AdminTherapistsError) {
    return {
      status: error.status || 400,
      code: error.code || "ADMIN_THERAPISTS_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof AdminResourcesError) {
    return {
      status: error.status || 400,
      code: error.code || "ADMIN_RESOURCES_ERROR",
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
  listAppointmentHistory = listAdminAppointmentHistory,
  createManualAppointment = createAdminManualAppointment,
  getAppointmentById = getAdminAppointmentDetail,
  removeAppointments = deleteAdminAppointments,
  setAppointmentStatus = updateAdminAppointmentStatus,
  setAppointmentRoom = updateAdminAppointmentRoom,
  listClients = listAdminClients,
  getClientById = getAdminClientDetail,
  removeClients = deleteAdminClients,
  listTherapists = listAdminTherapists,
  createTherapist = createAdminTherapist,
  getTherapistById = getAdminTherapistDetail,
  updateTherapistAvailability = updateAdminTherapistAvailability,
  updateTherapistProfile = updateAdminTherapistProfile,
  updateTherapistService = updateAdminTherapistService,
  listResources = listAdminResources,
  createResourceService = createService,
  createResourceRoom = createRoom,
  updateResourceService = updateService,
  updateResourceRoom = updateRoom,
  updateResourceCompatibility = updateServiceRoomCompatibility,
  search = searchAdmin,
  login = loginAdmin,
  verifyToken = verifyAdminToken
} = {}) {
  const router = Router();

  async function ensureSessionTimezone(connection) {
    if (!connection || typeof connection.query !== "function" || !SESSION_TIMEZONE) {
      return;
    }

    await connection.query("SET time_zone = ?", [SESSION_TIMEZONE]);
  }

  async function withConnection(res, handler) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await ensureSessionTimezone(connection);
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

  router.get("/appointments/history", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await listAppointmentHistory({
        connection,
        tenantSlug: req.query.tenantSlug,
        q: req.query.q,
        status: req.query.status,
        order: req.query.order,
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

  router.post("/appointments/:id/room", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await setAppointmentRoom({
        connection,
        appointmentId: req.params.id,
        roomId: req.body?.roomId,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.post("/appointments", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await createManualAppointment({
        connection,
        tenantSlug: req.body?.tenantSlug,
        phoneE164: req.body?.phoneE164,
        clientFullName: req.body?.clientFullName,
        serviceId: req.body?.serviceId,
        therapistId: req.body?.therapistId,
        roomId: req.body?.roomId,
        startsAt: req.body?.startsAt,
        now: new Date(),
        adminSession
      });

      res.status(201).json(payload);
    });
  });

  router.delete("/appointments/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await removeAppointments({
        connection,
        tenantSlug: req.query.tenantSlug,
        appointmentIds: [req.params.id],
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.delete("/appointments", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await removeAppointments({
        connection,
        tenantSlug: req.query.tenantSlug,
        appointmentIds: req.body?.ids,
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

  router.get("/therapists", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await listTherapists({
        connection,
        tenantSlug: req.query.tenantSlug,
        q: req.query.q,
        status: req.query.status,
        limit: req.query.limit,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.post("/therapists", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await createTherapist({
        connection,
        tenantSlug: req.body?.tenantSlug,
        fullName: req.body?.fullName,
        displayName: req.body?.displayName,
        phone: req.body?.phone,
        telegramChatId: req.body?.telegramChatId,
        isActive: req.body?.isActive,
        now: new Date(),
        adminSession
      });

      res.status(201).json(payload);
    });
  });

  router.get("/therapists/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await getTherapistById({
        connection,
        tenantSlug: req.query.tenantSlug,
        therapistId: req.params.id,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.patch("/therapists/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateTherapistProfile({
        connection,
        tenantSlug: req.query.tenantSlug,
        therapistId: req.params.id,
        fullName: req.body?.fullName,
        displayName: req.body?.displayName,
        phone: req.body?.phone,
        telegramChatId: req.body?.telegramChatId,
        isActive: req.body?.isActive,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.patch("/therapists/:id/availability", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateTherapistAvailability({
        connection,
        tenantSlug: req.query.tenantSlug,
        therapistId: req.params.id,
        days: req.body?.days,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.patch("/therapists/:id/services/:serviceId", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateTherapistService({
        connection,
        tenantSlug: req.query.tenantSlug,
        therapistId: req.params.id,
        serviceId: req.params.serviceId,
        isActive: req.body?.isActive,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.get("/resources", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await listResources({
        connection,
        tenantSlug: req.query.tenantSlug,
        resourceType: req.query.resourceType,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.post("/resources/services", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await createResourceService({
        connection,
        adminSession,
        name: req.body?.name,
        durationMinutes: req.body?.durationMinutes,
        priceAmount: req.body?.priceAmount,
        isActive: req.body?.isActive,
        requiredFeatureKeys: req.body?.requiredFeatureKeys
      });

      res.status(201).json(payload);
    });
  });

  router.post("/resources/rooms", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await createResourceRoom({
        connection,
        adminSession,
        name: req.body?.name,
        capacity: req.body?.capacity,
        featureKeys: req.body?.featureKeys
      });

      res.status(201).json(payload);
    });
  });

  router.patch("/resources/rooms/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateResourceRoom({
        connection,
        adminSession,
        roomId: req.params.id,
        name: req.body?.name,
        capacity: req.body?.capacity,
        isActive: req.body?.isActive,
        featureKeys: req.body?.featureKeys
      });

      res.status(200).json(payload);
    });
  });

  router.patch("/resources/services/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateResourceService({
        connection,
        adminSession,
        serviceId: req.params.id,
        name: req.body?.name,
        durationMinutes: req.body?.durationMinutes,
        priceAmount: req.body?.priceAmount,
        isActive: req.body?.isActive,
        requiredFeatureKeys: req.body?.requiredFeatureKeys
      });

      res.status(200).json(payload);
    });
  });

  router.patch("/resources/compatibilities/:serviceId/:roomId", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await updateResourceCompatibility({
        connection,
        adminSession,
        serviceId: req.params.serviceId,
        roomId: req.params.roomId,
        isActive: req.body?.isActive
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

  router.delete("/clients/:id", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await removeClients({
        connection,
        tenantSlug: req.query.tenantSlug,
        clientIds: [req.params.id],
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.get("/search", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await search({
        connection,
        q: req.query.q,
        type: req.query.type,
        limit: req.query.limit,
        now: new Date(),
        adminSession
      });

      res.status(200).json(payload);
    });
  });

  router.delete("/clients", async (req, res) => {
    const adminSession = authenticateAdmin(req, res, verifyToken);

    if (!adminSession) {
      return;
    }

    await withConnection(res, async (connection) => {
      const payload = await removeClients({
        connection,
        tenantSlug: req.query.tenantSlug,
        clientIds: req.body?.ids,
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
