const { Router } = require("express");

const { createPool } = require("../db/pool");
const {
  confirm,
  getAvailability,
  getCatalog,
  hold,
  identify
} = require("../services/publicBooking.service");
const {
  PublicBookingError,
  SlotOccupiedError,
  ValidationError
} = require("../services/errors");

let sharedPool = null;

function getSharedPool() {
  if (!sharedPool) {
    sharedPool = createPool();
  }

  return sharedPool;
}

function toErrorResponse(error) {
  if (error instanceof PublicBookingError) {
    return {
      status: error.status || 500,
      code: error.code || "PUBLIC_BOOKING_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof ValidationError) {
    return {
      status: 400,
      code: error.code || "VALIDATION_ERROR",
      message: error.message,
      details: error.details || {}
    };
  }

  if (error instanceof SlotOccupiedError || error?.code === "SLOT_OCCUPIED") {
    return {
      status: 409,
      code: "SLOT_NOT_AVAILABLE",
      message: "El slot ya no esta disponible",
      details: error.details || {}
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Error interno en reserva publica",
    details: {}
  };
}

function createPublicBookingRouter({ getPool = getSharedPool } = {}) {
  const router = Router();

  async function withConnection(res, handler) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await handler(connection);
    } catch (error) {
      const mapped = toErrorResponse(error);
      res.status(mapped.status).json({
        error: {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details
        }
      });
    } finally {
      connection.release();
    }
  }

  router.get("/catalog", async (req, res) => {
    await withConnection(res, async (connection) => {
      const result = await getCatalog({
        connection,
        tenantSlug: req.query.tenantSlug
      });

      res.status(200).json(result);
    });
  });

  router.post("/identify", async (req, res) => {
    await withConnection(res, async (connection) => {
      const result = await identify({
        connection,
        tenantSlug: req.body.tenantSlug,
        phoneE164: req.body.phoneE164,
        now: req.body.now || new Date()
      });

      res.status(200).json(result);
    });
  });

  router.post("/availability", async (req, res) => {
    await withConnection(res, async (connection) => {
      const result = await getAvailability({
        connection,
        tenantSlug: req.body.tenantSlug,
        phoneE164: req.body.phoneE164,
        serviceId: req.body.serviceId,
        therapistId: req.body.therapistId,
        date: req.body.date,
        timezone: req.body.timezone,
        from: req.body.from,
        to: req.body.to,
        stepMinutes: req.body.stepMinutes,
        now: req.body.now || new Date()
      });

      res.status(200).json(result);
    });
  });

  router.post("/hold", async (req, res) => {
    await withConnection(res, async (connection) => {
      const result = await hold({
        connection,
        tenantSlug: req.body.tenantSlug,
        phoneE164: req.body.phoneE164,
        serviceId: req.body.serviceId,
        startsAt: req.body.startsAt,
        therapistId: req.body.therapistId,
        roomId: req.body.roomId,
        now: req.body.now || new Date()
      });

      res.status(201).json(result);
    });
  });

  router.post("/confirm", async (req, res) => {
    await withConnection(res, async (connection) => {
      const idempotencyKey = req.get("Idempotency-Key");

      if (!idempotencyKey) {
        throw new PublicBookingError({
          status: 400,
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Idempotency-Key es obligatorio"
        });
      }

      const result = await confirm({
        connection,
        tenantSlug: req.body.tenantSlug,
        phoneE164: req.body.phoneE164,
        holdToken: req.body.holdToken,
        idempotencyKey,
        payload: {
          tenantSlug: req.body.tenantSlug,
          phoneE164: req.body.phoneE164,
          holdToken: req.body.holdToken
        },
        now: req.body.now || new Date()
      });

      res.status(result.responseCode).json(result.responseBody);
    });
  });

  return router;
}

const publicBookingRoute = createPublicBookingRouter();

module.exports = {
  createPublicBookingRouter,
  publicBookingRoute
};
