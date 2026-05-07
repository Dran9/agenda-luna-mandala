const { addMinutes, formatDateTimeForDbLocal, toDate } = require("../utils/dates");
const { listAvailableSlots } = require("./availability.service");
const {
  createHoldAppointment,
  confirmHoldAppointment,
  pickPublicAvailabilityPair,
  releaseExpiredHolds
} = require("./appointments.service");
const { PublicBookingError, ValidationError } = require("./errors");

const DEFAULT_TENANT_SLUG = "demo";
const DEFAULT_STEP_MINUTES = 30;
const DEFAULT_AVAILABILITY_WINDOW_DAYS = 5;
const DEFAULT_MIN_NOTICE_HOURS = 6;
const DEFAULT_PENALTY_PERCENT = 50;
const DEFAULT_DB_OFFSET = process.env.DB_TIMEZONE || "-04:00";

function normalizeTenantSlug(rawTenantSlug) {
  const value = String(rawTenantSlug || DEFAULT_TENANT_SLUG).trim();
  return value || DEFAULT_TENANT_SLUG;
}

function normalizePhoneE164(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");

  if (!digits) {
    throw new ValidationError("phoneE164 es requerido");
  }

  return digits;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function isClientOnboardingComplete(client) {
  if (!client) {
    return false;
  }

  const firstName = String(client.firstName || "").trim();
  const lastName = String(client.lastName || "").trim();
  const city = String(client.city || "").trim();
  const source = String(client.source || "").trim();
  const age = Number.parseInt(client.age, 10);
  const hasValidAge = Number.isInteger(age) && age >= 18 && age <= 75;
  const hasCompletedAt = Boolean(client.onboardingCompletedAt);

  return Boolean(firstName && lastName && city && source && hasValidAge && hasCompletedAt);
}

function normalizeDateKey(rawDate) {
  const value = String(rawDate || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function mapServiceIds(groupedIds) {
  if (!groupedIds) {
    return [];
  }

  return String(groupedIds)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolveCenter(connection, rawTenantSlug) {
  const tenantSlug = normalizeTenantSlug(rawTenantSlug);

  const [rows] = await connection.query(
    `SELECT
      id,
      slug,
      name,
      timezone
     FROM centers
     WHERE slug = ?
       AND is_active = 1
     LIMIT 1`,
    [tenantSlug]
  );

  if (rows.length > 0) {
    return {
      id: Number(rows[0].id),
      slug: rows[0].slug,
      displayName: rows[0].name,
      timezone: rows[0].timezone
    };
  }

  if (tenantSlug === DEFAULT_TENANT_SLUG) {
    const [fallbackRows] = await connection.query(
      `SELECT
        id,
        slug,
        name,
        timezone
       FROM centers
       WHERE is_active = 1
       ORDER BY id ASC
       LIMIT 1`
    );

    if (fallbackRows.length > 0) {
      return {
        id: Number(fallbackRows[0].id),
        slug: fallbackRows[0].slug,
        displayName: fallbackRows[0].name,
        timezone: fallbackRows[0].timezone
      };
    }
  }

  throw new PublicBookingError({
    status: 404,
    code: "TENANT_NOT_FOUND",
    message: "Centro no encontrado"
  });
}

function calculateAvailableActions({ startsAt, now, minimumNoticeHours, penaltyPercent }) {
  const startsAtDate = toDate(startsAt);
  const nowDate = toDate(now);
  const diffHours = (startsAtDate.getTime() - nowDate.getTime()) / 3_600_000;
  const allowed = diffHours >= minimumNoticeHours;

  if (allowed) {
    return [
      {
        action: "cancel",
        allowed: true,
        minimumNoticeHours,
        penaltyPercent,
        message: "Puedes cancelar sin penalidad dentro de la politica actual."
      },
      {
        action: "reschedule",
        allowed: true,
        minimumNoticeHours,
        penaltyPercent,
        message: "Puedes reagendar sin penalidad dentro de la politica actual."
      }
    ];
  }

  return [
    {
      action: "cancel",
      allowed: false,
      reason: "minimum_notice_violation",
      minimumNoticeHours,
      penaltyPercent,
      message: "Esta cita cae en ventana de politica 6h/50%."
    },
    {
      action: "reschedule",
      allowed: false,
      reason: "minimum_notice_violation",
      minimumNoticeHours,
      penaltyPercent,
      message: "Esta cita cae en ventana de politica 6h/50%."
    }
  ];
}

async function getCatalog({ connection, tenantSlug }) {
  const center = await resolveCenter(connection, tenantSlug);

  const [serviceRows] = await connection.query(
    `SELECT
      s.id,
      s.name,
      s.duration_minutes AS durationMinutes,
      COUNT(DISTINCT t.id) AS therapistCount
     FROM services s
     LEFT JOIN therapist_services ts
       ON ts.center_id = s.center_id
      AND ts.service_id = s.id
      AND ts.is_active = 1
     LEFT JOIN therapists t
       ON t.id = ts.therapist_id
      AND t.center_id = s.center_id
      AND t.is_active = 1
     WHERE s.center_id = ?
       AND s.is_active = 1
     GROUP BY s.id, s.name, s.duration_minutes
     ORDER BY s.id ASC`,
    [center.id]
  );

  const [therapistRows] = await connection.query(
    `SELECT
      t.id,
      COALESCE(t.display_name, t.full_name) AS displayName,
      GROUP_CONCAT(DISTINCT s.id ORDER BY s.id) AS serviceIds
     FROM therapists t
     LEFT JOIN therapist_services ts
       ON ts.center_id = t.center_id
      AND ts.therapist_id = t.id
      AND ts.is_active = 1
     LEFT JOIN services s
       ON s.id = ts.service_id
      AND s.center_id = t.center_id
      AND s.is_active = 1
     WHERE t.center_id = ?
       AND t.is_active = 1
     GROUP BY t.id, displayName
     ORDER BY t.id ASC`,
    [center.id]
  );

  return {
    center,
    services: serviceRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      durationMinutes: Number(row.durationMinutes),
      therapistCount: Number(row.therapistCount || 0),
      reservable: Number(row.therapistCount || 0) > 0
    })),
    therapists: therapistRows.map((row) => ({
      id: String(row.id),
      displayName: row.displayName,
      serviceIds: mapServiceIds(row.serviceIds)
    }))
  };
}

async function identify({ connection, tenantSlug, phoneE164, now = new Date() }) {
  const center = await resolveCenter(connection, tenantSlug);
  const normalizedPhone = normalizePhoneE164(phoneE164);

  const [clientRows] = await connection.query(
    `SELECT
      id,
      full_name AS fullName,
      first_name AS firstName,
      last_name AS lastName,
      age,
      city,
      source,
      onboarding_completed_at AS onboardingCompletedAt,
      whatsapp_e164 AS phoneE164
     FROM clients
     WHERE center_id = ?
       AND whatsapp_e164 = ?
       AND is_active = 1
     LIMIT 1`,
    [center.id, normalizedPhone]
  );

  if (clientRows.length === 0) {
    return {
      status: "new",
      center
    };
  }

  const client = clientRows[0];

  const [settingRows] = await connection.query(
    `SELECT
      cancellation_window_hours AS minimumNoticeHours,
      cancellation_fee_percent AS penaltyPercent
     FROM center_settings
     WHERE center_id = ?
     LIMIT 1`,
    [center.id]
  );

  const minimumNoticeHours = Number(settingRows[0]?.minimumNoticeHours || DEFAULT_MIN_NOTICE_HOURS);
  const penaltyPercent = Number(settingRows[0]?.penaltyPercent || DEFAULT_PENALTY_PERCENT);

  await releaseExpiredHolds({
    connection,
    centerId: center.id,
    now
  });

  const nowDb = formatDateTimeForDbLocal(now);

  const [appointmentRows] = await connection.query(
    `SELECT
      a.id,
      a.service_id AS serviceId,
      s.name AS serviceName,
      a.starts_at AS startsAt,
      a.ends_at AS endsAt,
      COALESCE(t.display_name, t.full_name) AS therapistName,
      r.name AS roomName,
      a.management_token AS managementToken
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN therapists t ON t.id = a.therapist_id
     INNER JOIN rooms r ON r.id = a.room_id
     WHERE a.center_id = ?
       AND a.client_id = ?
       AND a.status IN ('pending', 'confirmed')
       AND a.starts_at > ?
     ORDER BY a.starts_at ASC`,
    [center.id, client.id, nowDb]
  );

  const appointments = appointmentRows.map((row) => ({
    id: String(row.id),
    serviceId: String(row.serviceId),
    serviceName: row.serviceName,
    startsAt: toDate(row.startsAt).toISOString(),
    endsAt: toDate(row.endsAt).toISOString(),
    therapistName: row.therapistName,
    roomName: row.roomName,
    managementToken: row.managementToken,
    availableActions: calculateAvailableActions({
      startsAt: row.startsAt,
      now,
      minimumNoticeHours,
      penaltyPercent
    })
  }));

  return {
    status: "existing",
    center,
    client: {
      id: String(client.id),
      phoneE164: client.phoneE164,
      fullName: client.fullName,
      onboardingComplete: isClientOnboardingComplete(client)
    },
    appointments,
    nextAppointment: appointments[0] || null
  };
}

async function getAvailability({
  connection,
  tenantSlug,
  phoneE164,
  serviceId,
  therapistId,
  date,
  timezone,
  from,
  to,
  stepMinutes = DEFAULT_STEP_MINUTES,
  now = new Date()
}) {
  if (!phoneE164) {
    throw new PublicBookingError({
      status: 400,
      code: "PHONE_REQUIRED_BEFORE_AVAILABILITY",
      message: "Debes identificar WhatsApp antes de consultar horarios"
    });
  }

  const center = await resolveCenter(connection, tenantSlug);
  const normalizedServiceId = parseInteger(serviceId, NaN);

  if (!Number.isInteger(normalizedServiceId) || normalizedServiceId <= 0) {
    throw new ValidationError("serviceId invalido");
  }

  await releaseExpiredHolds({
    connection,
    centerId: center.id,
    now
  });

  const dateKey = normalizeDateKey(date);
  const fromDate = dateKey ? toDate(`${dateKey}T00:00:00${DEFAULT_DB_OFFSET}`) : (from ? toDate(from) : toDate(now));
  const toDateValue = dateKey ? addMinutes(fromDate, 24 * 60) : (to ? toDate(to) : addMinutes(fromDate, DEFAULT_AVAILABILITY_WINDOW_DAYS * 24 * 60));

  const availability = await listAvailableSlots({
    connection,
    centerId: center.id,
    serviceId: normalizedServiceId,
    fromInput: fromDate,
    toInput: toDateValue,
    stepMinutes: parseInteger(stepMinutes, DEFAULT_STEP_MINUTES),
    nowInput: now
  });

  return {
    center,
    serviceId: String(normalizedServiceId),
    date: dateKey,
    timezone: timezone || center.timezone,
    slots: availability
      .map((slot) => {
        const pair = pickPublicAvailabilityPair({
          pairs: slot.pairs,
          therapistId
        });

        if (!pair) {
          return null;
        }

        return {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          therapistId: String(pair.therapistId),
          therapistName: pair.therapistName,
          roomId: String(pair.roomId),
          roomName: pair.roomName
        };
      })
      .filter(Boolean)
  };
}

async function hold({
  connection,
  tenantSlug,
  phoneE164,
  serviceId,
  startsAt,
  therapistId,
  roomId,
  now = new Date()
}) {
  const center = await resolveCenter(connection, tenantSlug);
  const normalizedPhone = normalizePhoneE164(phoneE164);

  const holdResult = await createHoldAppointment({
    connection,
    centerId: center.id,
    serviceId,
    phoneE164: normalizedPhone,
    startsAt,
    therapistId,
    roomId,
    now
  });

  return {
    ...holdResult,
    center
  };
}

async function confirm({
  connection,
  tenantSlug,
  phoneE164,
  holdToken,
  idempotencyKey,
  payload,
  now = new Date()
}) {
  const center = await resolveCenter(connection, tenantSlug);
  const normalizedPhone = normalizePhoneE164(phoneE164);

  const confirmResult = await confirmHoldAppointment({
    connection,
    centerId: center.id,
    holdToken,
    phoneE164: normalizedPhone,
    idempotencyKey,
    payload,
    now
  });

  return {
    ...confirmResult,
    responseBody: {
      ...confirmResult.responseBody,
      center
    }
  };
}

module.exports = {
  DEFAULT_TENANT_SLUG,
  normalizeTenantSlug,
  normalizePhoneE164,
  resolveCenter,
  calculateAvailableActions,
  getCatalog,
  identify,
  getAvailability,
  hold,
  confirm
};
