const assert = require("node:assert/strict");
const test = require("node:test");

const {
  confirm,
  getAvailability,
  getCatalog,
  hold,
  identify
} = require("../server/services/publicBooking.service");
const { PublicBookingError } = require("../server/services/errors");
const { addMinutes, formatDateTimeForDbLocal } = require("../server/utils/dates");

const DB_OFFSET = "-04:00";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseLocalDbDateTime(localDateTime) {
  if (localDateTime instanceof Date) {
    return new Date(localDateTime.getTime());
  }

  if (typeof localDateTime === "string" && localDateTime.includes("T")) {
    return new Date(localDateTime);
  }

  return new Date(`${String(localDateTime).replace(" ", "T")}${DB_OFFSET}`);
}

function toLocalDbString(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return formatDateTimeForDbLocal(value, DB_OFFSET);
}

class FakeBookingConnection {
  constructor(seed = {}) {
    this.state = {
      centers: seed.centers || [],
      centerSettings: seed.centerSettings || [],
      services: seed.services || [],
      therapists: seed.therapists || [],
      therapistServices: seed.therapistServices || [],
      rooms: seed.rooms || [],
      serviceRooms: seed.serviceRooms || [],
      resourceSchedules: seed.resourceSchedules || [],
      resourceBlocks: seed.resourceBlocks || [],
      clients: seed.clients || [],
      appointments: seed.appointments || [],
      claims: seed.claims || [],
      roundRobinState: seed.roundRobinState || [],
      idempotency: seed.idempotency || []
    };

    this._snapshots = [];
    this.beginCount = 0;
    this.commitCount = 0;
    this.rollbackCount = 0;
    this.clientIdSequence = 1000;
    this.appointmentIdSequence = 2000;
    this.now = seed.now ? new Date(seed.now) : new Date("2026-05-11T08:00:00-04:00");
  }

  async beginTransaction() {
    this.beginCount += 1;
    this._snapshots.push(clone(this.state));
  }

  async commit() {
    this.commitCount += 1;
    this._snapshots.pop();
  }

  async rollback() {
    this.rollbackCount += 1;
    const snapshot = this._snapshots.pop();

    if (snapshot) {
      this.state = snapshot;
    }
  }

  _serviceTherapistCount(centerId, serviceId) {
    const therapistIds = new Set();

    for (const ts of this.state.therapistServices) {
      if (ts.centerId !== centerId || ts.serviceId !== serviceId || ts.isActive !== 1) {
        continue;
      }

      const therapist = this.state.therapists.find(
        (entry) => entry.centerId === centerId && entry.id === ts.therapistId && entry.isActive === 1
      );

      if (therapist) {
        therapistIds.add(ts.therapistId);
      }
    }

    return therapistIds.size;
  }

  async query(sql, params = []) {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();

    if (normalizedSql.includes("FROM centers") && normalizedSql.includes("WHERE slug = ?")) {
      const [tenantSlug] = params;
      const center = this.state.centers.find((entry) => entry.slug === tenantSlug && entry.isActive === 1);
      if (!center) return [[]];
      return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
    }

    if (normalizedSql.includes("FROM centers") && normalizedSql.includes("WHERE is_active = 1") && normalizedSql.includes("ORDER BY id ASC")) {
      const center = this.state.centers.find((entry) => entry.isActive === 1);
      if (!center) return [[]];
      return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
    }

    if (normalizedSql.includes("FROM services s") && normalizedSql.includes("COUNT(DISTINCT t.id)")) {
      const [centerId] = params;
      const rows = this.state.services
        .filter((service) => service.centerId === centerId && service.isActive === 1)
        .map((service) => ({
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          therapistCount: this._serviceTherapistCount(centerId, service.id)
        }));
      return [rows];
    }

    if (normalizedSql.includes("FROM therapists t") && normalizedSql.includes("GROUP_CONCAT")) {
      const [centerId] = params;
      const rows = this.state.therapists
        .filter((therapist) => therapist.centerId === centerId && therapist.isActive === 1)
        .map((therapist) => {
          const serviceIds = this.state.therapistServices
            .filter(
              (ts) =>
                ts.centerId === centerId &&
                ts.therapistId === therapist.id &&
                ts.isActive === 1 &&
                this.state.services.some((service) => service.id === ts.serviceId && service.centerId === centerId && service.isActive === 1)
            )
            .map((ts) => ts.serviceId)
            .sort((left, right) => left - right);

          return {
            id: therapist.id,
            displayName: therapist.displayName,
            serviceIds: serviceIds.join(",")
          };
        });

      return [rows];
    }

    if (normalizedSql.includes("FROM clients") && normalizedSql.includes("whatsapp_e164 = ?") && normalizedSql.includes("LIMIT 1") && !normalizedSql.includes("FOR UPDATE")) {
      const [centerId, phone] = params;
      const client = this.state.clients.find(
        (entry) => entry.centerId === centerId && entry.phoneE164 === phone && entry.isActive === 1
      );

      if (!client) return [[]];

      return [[{ id: client.id, fullName: client.fullName, phoneE164: client.phoneE164 }]];
    }

    if (normalizedSql.includes("INSERT INTO clients")) {
      const [centerId, fullName, phone] = params;

      const duplicate = this.state.clients.find(
        (entry) => entry.centerId === centerId && entry.phoneE164 === phone
      );

      if (duplicate) {
        const error = new Error("Duplicate client");
        error.code = "ER_DUP_ENTRY";
        error.errno = 1062;
        throw error;
      }

      const newClient = {
        id: this.clientIdSequence,
        centerId,
        fullName,
        phoneE164: phone,
        isActive: 1
      };
      this.clientIdSequence += 1;
      this.state.clients.push(newClient);
      return [{ insertId: newClient.id }];
    }

    if (normalizedSql.includes("FROM center_settings") && normalizedSql.includes("cancellation_window_hours")) {
      const [centerId] = params;
      const setting = this.state.centerSettings.find((entry) => entry.centerId === centerId);
      if (!setting) return [[]];
      return [[{ minimumNoticeHours: setting.minimumNoticeHours, penaltyPercent: setting.penaltyPercent }]];
    }

    if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("a.status IN ('pending', 'confirmed')") && normalizedSql.includes("a.starts_at > ?")) {
      const [centerId, clientId, nowDb] = params;
      const rows = this.state.appointments
        .filter((appointment) => {
          if (appointment.centerId !== centerId) return false;
          if (appointment.clientId !== clientId) return false;
          if (!(appointment.status === "pending" || appointment.status === "confirmed")) return false;

          const startsAtDb = toLocalDbString(appointment.startsAt);
          return startsAtDb > nowDb;
        })
        .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
        .map((appointment) => {
          const service = this.state.services.find((entry) => entry.id === appointment.serviceId);
          const therapist = this.state.therapists.find((entry) => entry.id === appointment.therapistId);
          const room = this.state.rooms.find((entry) => entry.id === appointment.roomId);

          return {
            id: appointment.id,
            serviceId: appointment.serviceId,
            serviceName: service ? service.name : "",
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt,
            therapistName: therapist ? therapist.displayName : "",
            roomName: room ? room.name : "",
            managementToken: appointment.managementToken
          };
        });

      return [rows];
    }

    if (normalizedSql.includes("FROM appointments") && normalizedSql.includes("status = 'pending'") && normalizedSql.includes("hold_token IS NOT NULL") && normalizedSql.includes("created_at <= ?") && normalizedSql.includes("FOR UPDATE")) {
      const [centerId, cutoff] = params;
      const cutoffTime = new Date(cutoff).getTime();
      const rows = this.state.appointments
        .filter((appointment) => {
          if (appointment.centerId !== centerId) return false;
          if (appointment.status !== "pending") return false;
          if (!appointment.holdToken) return false;
          return new Date(appointment.createdAt).getTime() <= cutoffTime;
        })
        .map((appointment) => ({ id: appointment.id }));

      return [rows];
    }

    if (normalizedSql.includes("FROM services") && normalizedSql.includes("duration_minutes AS durationMinutes") && normalizedSql.includes("WHERE center_id = ? AND id = ?")) {
      const [centerId, serviceId] = params;
      const service = this.state.services.find(
        (entry) => entry.centerId === centerId && entry.id === serviceId
      );
      if (!service) return [[]];
      return [[{
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes || 0,
        bufferAfterMinutes: service.bufferAfterMinutes || 0,
        isActive: service.isActive
      }]];
    }

    if (normalizedSql.includes("FROM services") && normalizedSql.includes("WHERE center_id = ?") && normalizedSql.includes("AND id = ?") && normalizedSql.includes("AND is_active = 1") && normalizedSql.includes("SELECT id")) {
      const [centerId, serviceId] = params;
      const service = this.state.services.find(
        (entry) => entry.centerId === centerId && entry.id === serviceId && entry.isActive === 1
      );
      if (!service) return [[]];
      return [[{ id: service.id }]];
    }

    if (normalizedSql.includes("FROM therapist_services ts") && normalizedSql.includes("INNER JOIN therapists t")) {
      const [centerId, serviceId] = params;
      const rows = this.state.therapistServices
        .filter((entry) => entry.centerId === centerId && entry.serviceId === serviceId && entry.isActive === 1)
        .map((entry) => {
          const therapist = this.state.therapists.find(
            (candidate) => candidate.centerId === centerId && candidate.id === entry.therapistId && candidate.isActive === 1
          );

          if (!therapist) return null;

          return {
            therapistId: therapist.id,
            therapistName: therapist.displayName,
            isActive: therapist.isActive
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.therapistId - right.therapistId);

      return [rows];
    }

    if (normalizedSql.includes("FROM service_rooms sr") && normalizedSql.includes("INNER JOIN rooms r")) {
      const [centerId, serviceId] = params;
      const rows = this.state.serviceRooms
        .filter((entry) => entry.centerId === centerId && entry.serviceId === serviceId && entry.isActive === 1)
        .map((entry) => {
          const room = this.state.rooms.find(
            (candidate) => candidate.centerId === centerId && candidate.id === entry.roomId && candidate.isActive === 1
          );

          if (!room) return null;

          return {
            roomId: room.id,
            roomName: room.name,
            isActive: room.isActive,
            isCompatible: entry.isActive
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.roomId - right.roomId);

      return [rows];
    }

    if (normalizedSql.includes("FROM resource_schedules")) {
      const [centerId, ...resourceIds] = params;
      const therapistCatalog = new Set(this.state.therapists.map((entry) => entry.id));
      const roomCatalog = new Set(this.state.rooms.map((entry) => entry.id));
      const therapistIds = new Set();
      const roomIds = new Set();

      for (const rawId of resourceIds) {
        const id = Number(rawId);
        if (Number.isNaN(id)) continue;
        if (therapistCatalog.has(id)) therapistIds.add(id);
        if (roomCatalog.has(id)) roomIds.add(id);
      }

      const rows = this.state.resourceSchedules
        .filter((entry) => {
          if (entry.centerId !== centerId || entry.isActive !== 1) return false;
          if (entry.resourceType === "therapist") return therapistIds.has(entry.resourceId);
          if (entry.resourceType === "room") return roomIds.has(entry.resourceId);
          return false;
        })
        .map((entry) => ({
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          weekday: entry.weekday,
          startTime: entry.startTime,
          endTime: entry.endTime,
          slotMinutes: entry.slotMinutes,
          validFrom: entry.validFrom || null,
          validTo: entry.validTo || null,
          isActive: entry.isActive
        }));

      return [rows];
    }

    if (normalizedSql.includes("FROM resource_blocks")) {
      const [centerId, windowEnd, windowStart, ...resourceIds] = params;
      const therapistCatalog = new Set(this.state.therapists.map((entry) => entry.id));
      const roomCatalog = new Set(this.state.rooms.map((entry) => entry.id));
      const therapistIds = new Set();
      const roomIds = new Set();

      for (const rawId of resourceIds) {
        const id = Number(rawId);
        if (Number.isNaN(id)) continue;
        if (therapistCatalog.has(id)) therapistIds.add(id);
        if (roomCatalog.has(id)) roomIds.add(id);
      }
      const endTime = new Date(windowEnd).getTime();
      const startTime = new Date(windowStart).getTime();

      const rows = this.state.resourceBlocks
        .filter((entry) => {
          if (entry.centerId !== centerId) return false;
          if (entry.resourceType === "therapist" && !therapistIds.has(entry.resourceId)) return false;
          if (entry.resourceType === "room" && !roomIds.has(entry.resourceId)) return false;

          const blockStart = new Date(entry.startsAt).getTime();
          const blockEnd = new Date(entry.endsAt).getTime();
          return blockStart < endTime && blockEnd > startTime;
        })
        .map((entry) => ({
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          startsAt: entry.startsAt,
          endsAt: entry.endsAt
        }));

      return [rows];
    }

    if (normalizedSql.includes("FROM appointment_resource_claims") && normalizedSql.includes("resource_type AS resourceType") && normalizedSql.includes("claim_time >= ?") && normalizedSql.includes("claim_time < ?")) {
      const [centerId, claimFrom, claimTo, ...resourceIds] = params;
      const therapistCatalog = new Set(this.state.therapists.map((entry) => entry.id));
      const roomCatalog = new Set(this.state.rooms.map((entry) => entry.id));
      const therapistIds = new Set();
      const roomIds = new Set();

      for (const rawId of resourceIds) {
        const id = Number(rawId);
        if (Number.isNaN(id)) continue;
        if (therapistCatalog.has(id)) therapistIds.add(id);
        if (roomCatalog.has(id)) roomIds.add(id);
      }
      const fromDb = toLocalDbString(claimFrom);
      const toDb = toLocalDbString(claimTo);

      const rows = this.state.claims
        .filter((entry) => {
          if (entry.centerId !== centerId) return false;
          if (entry.resourceType === "therapist" && !therapistIds.has(entry.resourceId)) return false;
          if (entry.resourceType === "room" && !roomIds.has(entry.resourceId)) return false;
          return entry.claimTime >= fromDb && entry.claimTime < toDb;
        })
        .map((entry) => ({
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          claimTime: parseLocalDbDateTime(entry.claimTime)
        }));

      return [rows];
    }

    if (normalizedSql.includes("FROM round_robin_state") && normalizedSql.includes("LIMIT 1")) {
      const [centerId, serviceId] = params;
      const entry = this.state.roundRobinState.find(
        (row) => row.centerId === centerId && row.serviceId === serviceId
      );
      if (!entry) return [[]];
      return [[{ lastTherapistId: entry.lastTherapistId }]];
    }

    if (normalizedSql.includes("FROM appointment_resource_claims") && normalizedSql.includes("resource_type = 'therapist'") && normalizedSql.includes("GROUP BY resource_id")) {
      const [centerId, windowStart, windowEnd, ...therapistIds] = params;
      const fromDb = toLocalDbString(windowStart);
      const toDb = toLocalDbString(windowEnd);
      const rows = [];

      for (const therapistId of therapistIds.map((id) => Number(id))) {
        const count = this.state.claims.filter(
          (entry) =>
            entry.centerId === centerId &&
            entry.resourceType === "therapist" &&
            entry.resourceId === therapistId &&
            entry.claimTime >= fromDb &&
            entry.claimTime < toDb
        ).length;

        if (count > 0) {
          rows.push({ therapistId, claimCount: count });
        }
      }

      return [rows];
    }

    if (normalizedSql.includes("INSERT INTO round_robin_state")) {
      const [centerId, serviceId, therapistId] = params;
      const existing = this.state.roundRobinState.find(
        (entry) => entry.centerId === centerId && entry.serviceId === serviceId
      );

      if (existing) {
        existing.lastTherapistId = therapistId;
      } else {
        this.state.roundRobinState.push({ centerId, serviceId, lastTherapistId: therapistId });
      }

      return [{ affectedRows: 1 }];
    }

    if (normalizedSql.includes("INSERT INTO appointments")) {
      const [
        centerId,
        publicCode,
        holdToken,
        managementToken,
        clientId,
        serviceId,
        therapistId,
        roomId,
        startsAt,
        endsAt
      ] = params;

      const appointment = {
        id: this.appointmentIdSequence,
        centerId,
        publicCode,
        holdToken,
        managementToken,
        clientId,
        serviceId,
        therapistId,
        roomId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        status: "pending",
        createdAt: new Date(this.now),
        source: "public_booking"
      };
      this.appointmentIdSequence += 1;
      this.state.appointments.push(appointment);
      return [{ insertId: appointment.id }];
    }

    if (normalizedSql.includes("FROM appointments") && normalizedSql.includes("created_at AS createdAt") && normalizedSql.includes("WHERE id = ?")) {
      const [appointmentId] = params;
      const appointment = this.state.appointments.find((entry) => entry.id === appointmentId);
      if (!appointment) return [[]];
      return [[{ id: appointment.id, createdAt: new Date(appointment.createdAt) }]];
    }

    if (normalizedSql.includes("FROM idempotency_keys") && normalizedSql.includes("FOR UPDATE")) {
      const [centerId, scope, key] = params;
      const row = this.state.idempotency.find(
        (entry) => entry.centerId === centerId && entry.scope === scope && entry.idemKey === key
      );

      if (!row) return [[]];

      return [[{
        requestHash: row.requestHash,
        responseCode: row.responseCode,
        responseJson: row.responseJson,
        lockedUntil: row.lockedUntil
      }]];
    }

    if (normalizedSql.includes("INSERT INTO idempotency_keys")) {
      const [centerId, scope, idemKey, requestHash] = params;
      this.state.idempotency.push({
        centerId,
        scope,
        idemKey,
        requestHash,
        responseCode: null,
        responseJson: null,
        lockedUntil: addMinutes(this.now, 5)
      });
      return [{ affectedRows: 1 }];
    }

    if (normalizedSql.includes("UPDATE idempotency_keys") && normalizedSql.includes("response_code = NULL")) {
      const [requestHash, centerId, scope, idemKey] = params;
      const row = this.state.idempotency.find(
        (entry) => entry.centerId === centerId && entry.scope === scope && entry.idemKey === idemKey
      );

      if (row) {
        row.requestHash = requestHash;
        row.responseCode = null;
        row.responseJson = null;
        row.lockedUntil = addMinutes(this.now, 5);
      }

      return [{ affectedRows: row ? 1 : 0 }];
    }

    if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("a.hold_token = ?") && normalizedSql.includes("FOR UPDATE")) {
      const [centerId, holdToken] = params;
      const appointment = this.state.appointments.find(
        (entry) => entry.centerId === centerId && entry.holdToken === holdToken
      );

      if (!appointment) return [[]];

      const client = this.state.clients.find((entry) => entry.id === appointment.clientId);
      const service = this.state.services.find((entry) => entry.id === appointment.serviceId);
      const therapist = this.state.therapists.find((entry) => entry.id === appointment.therapistId);
      const room = this.state.rooms.find((entry) => entry.id === appointment.roomId);

      return [[{
        appointmentId: appointment.id,
        publicCode: appointment.publicCode,
        managementToken: appointment.managementToken,
        centerId: appointment.centerId,
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        therapistId: appointment.therapistId,
        roomId: appointment.roomId,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        status: appointment.status,
        createdAt: appointment.createdAt,
        phoneE164: client ? client.phoneE164 : "",
        serviceName: service ? service.name : "",
        therapistName: therapist ? therapist.displayName : "",
        roomName: room ? room.name : ""
      }]];
    }

    if (normalizedSql.includes("UPDATE appointments") && normalizedSql.includes("SET status = 'confirmed'")) {
      const [appointmentId] = params;
      const appointment = this.state.appointments.find(
        (entry) => entry.id === appointmentId && entry.status === "pending"
      );

      if (!appointment) return [{ affectedRows: 0 }];

      appointment.status = "confirmed";
      appointment.holdToken = null;
      return [{ affectedRows: 1 }];
    }

    if (normalizedSql.includes("UPDATE appointments") && normalizedSql.includes("status = 'cancelled'") && normalizedSql.includes("hold_expired")) {
      const [_cancelledAt, centerId, ...appointmentIds] = params;
      let affectedRows = 0;

      for (const appointment of this.state.appointments) {
        if (
          appointment.centerId === centerId &&
          appointmentIds.includes(appointment.id) &&
          appointment.status === "pending"
        ) {
          appointment.status = "cancelled";
          appointment.holdToken = null;
          appointment.cancellationReason = "hold_expired";
          affectedRows += 1;
        }
      }

      return [{ affectedRows }];
    }

    if (normalizedSql.includes("DELETE FROM appointment_resource_claims WHERE appointment_id = ?")) {
      const [appointmentId] = params;
      const before = this.state.claims.length;
      this.state.claims = this.state.claims.filter((entry) => entry.appointmentId !== appointmentId);
      return [{ affectedRows: before - this.state.claims.length }];
    }

    if (normalizedSql.includes("INSERT INTO appointment_resource_claims")) {
      const rows = [];

      for (let index = 0; index < params.length; index += 5) {
        rows.push({
          centerId: Number(params[index]),
          appointmentId: Number(params[index + 1]),
          resourceType: params[index + 2],
          resourceId: Number(params[index + 3]),
          claimTime: String(params[index + 4])
        });
      }

      for (const row of rows) {
        const duplicate = this.state.claims.some(
          (entry) =>
            entry.centerId === row.centerId &&
            entry.resourceType === row.resourceType &&
            entry.resourceId === row.resourceId &&
            entry.claimTime === row.claimTime
        );

        if (duplicate) {
          const error = new Error("Duplicate claim");
          error.code = "ER_DUP_ENTRY";
          error.errno = 1062;
          throw error;
        }
      }

      this.state.claims.push(...rows);
      return [{ affectedRows: rows.length }];
    }

    if (normalizedSql.includes("SELECT COUNT(*) AS claimCount") && normalizedSql.includes("FROM appointment_resource_claims")) {
      const [appointmentId] = params;
      const claimCount = this.state.claims.filter((entry) => entry.appointmentId === appointmentId).length;
      return [[{ claimCount }]];
    }

    if (normalizedSql.includes("UPDATE idempotency_keys") && normalizedSql.includes("response_code = ?")) {
      const [responseCode, responseJson, centerId, scope, idemKey] = params;
      const row = this.state.idempotency.find(
        (entry) => entry.centerId === centerId && entry.scope === scope && entry.idemKey === idemKey
      );

      if (row) {
        row.responseCode = responseCode;
        row.responseJson = responseJson;
        row.lockedUntil = null;
      }

      return [{ affectedRows: row ? 1 : 0 }];
    }

    throw new Error(`Unsupported SQL in fake booking connection: ${normalizedSql}`);
  }
}

function createFixture(overrides = {}) {
  return {
    centers: [
      {
        id: 1,
        slug: "luna-mandala",
        name: "Luna Mandala",
        timezone: "America/La_Paz",
        isActive: 1
      }
    ],
    centerSettings: [
      {
        centerId: 1,
        minimumNoticeHours: 6,
        penaltyPercent: 50
      }
    ],
    services: [
      { id: 10, centerId: 1, name: "Masaje", durationMinutes: 60, isActive: 1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
      { id: 11, centerId: 1, name: "Reiki", durationMinutes: 60, isActive: 0, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }
    ],
    therapists: [
      { id: 100, centerId: 1, displayName: "Ana", isActive: 1 },
      { id: 101, centerId: 1, displayName: "Bea", isActive: 0 }
    ],
    therapistServices: [
      { centerId: 1, therapistId: 100, serviceId: 10, isActive: 1 },
      { centerId: 1, therapistId: 101, serviceId: 10, isActive: 1 },
      { centerId: 1, therapistId: 100, serviceId: 11, isActive: 1 }
    ],
    rooms: [
      { id: 200, centerId: 1, name: "Sala Luna", isActive: 1 }
    ],
    serviceRooms: [
      { centerId: 1, serviceId: 10, roomId: 200, isActive: 1 }
    ],
    resourceSchedules: [
      {
        centerId: 1,
        resourceType: "therapist",
        resourceId: 100,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        isActive: 1
      },
      {
        centerId: 1,
        resourceType: "room",
        resourceId: 200,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        isActive: 1
      }
    ],
    resourceBlocks: [],
    clients: overrides.clients || [],
    appointments: overrides.appointments || [],
    claims: overrides.claims || [],
    roundRobinState: overrides.roundRobinState || [],
    idempotency: overrides.idempotency || [],
    now: overrides.now || "2026-05-11T08:00:00-04:00"
  };
}

test("catalog filtra servicios y terapeutas inactivos", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const result = await getCatalog({
    connection,
    tenantSlug: "luna-mandala"
  });

  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, "10");
  assert.equal(result.therapists.length, 1);
  assert.equal(result.therapists[0].id, "100");
});

test("identify devuelve cliente nuevo si no existe", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const result = await identify({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.status, "new");
});

test("identify si devuelve confirmed futura con managementToken", async () => {
  const fixture = createFixture({
    clients: [{ id: 501, centerId: 1, phoneE164: "71234567", fullName: "Cliente", isActive: 1 }],
    appointments: [
      {
        id: 900,
        centerId: 1,
        clientId: 501,
        serviceId: 10,
        therapistId: 100,
        roomId: 200,
        status: "confirmed",
        startsAt: new Date("2026-05-11T11:00:00-04:00"),
        endsAt: new Date("2026-05-11T12:00:00-04:00"),
        managementToken: "mgmt-token",
        publicCode: "PUB-1",
        holdToken: null,
        createdAt: new Date("2026-05-11T08:00:00-04:00")
      }
    ]
  });

  const connection = new FakeBookingConnection(fixture);

  const result = await identify({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.status, "existing");
  assert.equal(result.appointments.length, 1);
  assert.equal(result.appointments[0].managementToken, "mgmt-token");
});

test("identify no devuelve hold pending expirado", async () => {
  const fixture = createFixture({
    clients: [{ id: 501, centerId: 1, phoneE164: "71234567", fullName: "Cliente", isActive: 1 }],
    appointments: [
      {
        id: 901,
        centerId: 1,
        clientId: 501,
        serviceId: 10,
        therapistId: 100,
        roomId: 200,
        status: "pending",
        startsAt: new Date("2026-05-11T11:00:00-04:00"),
        endsAt: new Date("2026-05-11T12:00:00-04:00"),
        managementToken: "mgmt-expired",
        publicCode: "PUB-EXP",
        holdToken: "hold-expired",
        createdAt: new Date("2026-05-11T07:55:00-04:00")
      }
    ]
  });

  const connection = new FakeBookingConnection(fixture);

  const result = await identify({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.status, "existing");
  assert.equal(result.appointments.length, 0);
  assert.equal(result.nextAppointment, null);
  assert.equal(connection.state.appointments[0].status, "cancelled");
  assert.equal(connection.state.appointments[0].holdToken, null);
});

test("identify si devuelve hold pending vigente", async () => {
  const fixture = createFixture({
    clients: [{ id: 501, centerId: 1, phoneE164: "71234567", fullName: "Cliente", isActive: 1 }],
    appointments: [
      {
        id: 902,
        centerId: 1,
        clientId: 501,
        serviceId: 10,
        therapistId: 100,
        roomId: 200,
        status: "pending",
        startsAt: new Date("2026-05-11T11:00:00-04:00"),
        endsAt: new Date("2026-05-11T12:00:00-04:00"),
        managementToken: "mgmt-pending",
        publicCode: "PUB-PND",
        holdToken: "hold-vigente",
        createdAt: new Date("2026-05-11T07:58:30-04:00")
      }
    ]
  });

  const connection = new FakeBookingConnection(fixture);

  const result = await identify({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.status, "existing");
  assert.equal(result.appointments.length, 1);
  assert.equal(result.appointments[0].id, "902");
  assert.equal(result.appointments[0].managementToken, "mgmt-pending");
});

test("availability acepta contrato date/timezone y devuelve BookingSlot plano", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const result = await getAvailability({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    therapistId: 100,
    date: "2026-05-11",
    timezone: "America/La_Paz",
    stepMinutes: 60,
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.ok(result.slots.length > 0);
  assert.equal(result.slots[0].therapistId, "100");
  assert.equal(result.slots[0].roomId, "200");
  assert.equal(Object.hasOwn(result.slots[0], "pairs"), false);
});

test("availability exige telefono antes de mostrar slots", async () => {
  const connection = new FakeBookingConnection(createFixture());

  await assert.rejects(
    getAvailability({
      connection,
      tenantSlug: "luna-mandala",
      serviceId: 10,
      date: "2026-05-11",
      timezone: "America/La_Paz",
      now: "2026-05-11T08:00:00-04:00"
    }),
    (error) =>
      error instanceof PublicBookingError &&
      error.status === 400 &&
      error.code === "PHONE_REQUIRED_BEFORE_AVAILABILITY"
  );
});

test("availability no devuelve slots ocupados por claim", async () => {
  const fixture = createFixture({
    claims: [
      {
        centerId: 1,
        appointmentId: 999,
        resourceType: "therapist",
        resourceId: 100,
        claimTime: "2026-05-11 09:00:00"
      }
    ]
  });

  const connection = new FakeBookingConnection(fixture);

  const result = await getAvailability({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    date: "2026-05-11",
    timezone: "America/La_Paz",
    stepMinutes: 60,
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.slots.some((slot) => slot.startsAt === "2026-05-11T13:00:00.000Z"), false);
});

test("hold crea cita pending con token y calcula endsAt", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const result = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  assert.equal(result.status, "pending");
  assert.equal(typeof result.holdToken, "string");
  assert.equal(result.endsAt, "2026-05-11T14:00:00.000Z");
  assert.equal(connection.state.appointments.length, 1);
  assert.equal(connection.state.appointments[0].status, "pending");
  assert.ok(connection.state.claims.length > 0);
});

test("segundo hold del mismo recurso y hora falla por claims del hold vigente", async () => {
  const connection = new FakeBookingConnection(createFixture());

  await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  await assert.rejects(
    hold({
      connection,
      tenantSlug: "luna-mandala",
      phoneE164: "79999999",
      serviceId: 10,
      startsAt: "2026-05-11T09:00:00-04:00",
      now: "2026-05-11T08:01:00-04:00"
    }),
    (error) => error instanceof PublicBookingError && error.status === 409 && error.code === "SLOT_NOT_AVAILABLE"
  );
});

test("hold con terapeuta solicitado no cae silenciosamente a otro terapeuta", async () => {
  const connection = new FakeBookingConnection(createFixture());

  await assert.rejects(
    hold({
      connection,
      tenantSlug: "luna-mandala",
      phoneE164: "71234567",
      serviceId: 10,
      startsAt: "2026-05-11T09:00:00-04:00",
      therapistId: 999,
      now: "2026-05-11T08:00:00-04:00"
    }),
    (error) => error instanceof PublicBookingError && error.status === 409 && error.code === "SLOT_NOT_AVAILABLE"
  );
});

test("hold expirado libera claims y permite nuevo hold", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const firstHold = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  connection.now = new Date("2026-05-11T08:04:00-04:00");

  const secondHold = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "79999999",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:04:00-04:00"
  });

  const firstAppointment = connection.state.appointments.find((appointment) => appointment.id === firstHold.appointmentId);

  assert.equal(firstAppointment.status, "cancelled");
  assert.equal(secondHold.status, "pending");
  assert.equal(connection.state.claims.some((claim) => claim.appointmentId === firstHold.appointmentId), false);
  assert.equal(connection.state.claims.some((claim) => claim.appointmentId === secondHold.appointmentId), true);
});

test("confirm crea confirmed + claims en una transaccion", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const holdResult = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  const beginsBeforeConfirm = connection.beginCount;

  const confirmResult = await confirm({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    holdToken: holdResult.holdToken,
    idempotencyKey: "idem-1",
    payload: {
      tenantSlug: "luna-mandala",
      phoneE164: "71234567",
      holdToken: holdResult.holdToken
    },
    now: "2026-05-11T08:02:00-04:00"
  });

  assert.equal(confirmResult.responseBody.status, "confirmed");
  assert.equal(connection.state.appointments[0].status, "confirmed");
  assert.ok(connection.state.claims.length > 0);
  assert.equal(connection.beginCount - beginsBeforeConfirm, 1);
});

test("confirm con colision devuelve 409 SLOT_NOT_AVAILABLE", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const holdResult = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  connection.state.claims = connection.state.claims.filter((claim) => claim.appointmentId !== holdResult.appointmentId);
  connection.state.claims.push({
    centerId: 1,
    appointmentId: 4040,
    resourceType: "therapist",
    resourceId: 100,
    claimTime: "2026-05-11 09:00:00"
  });

  await assert.rejects(
    confirm({
      connection,
      tenantSlug: "luna-mandala",
      phoneE164: "71234567",
      holdToken: holdResult.holdToken,
      idempotencyKey: "idem-collision",
      payload: {
        tenantSlug: "luna-mandala",
        phoneE164: "71234567",
        holdToken: holdResult.holdToken
      },
      now: "2026-05-11T08:02:00-04:00"
    }),
    (error) => error instanceof PublicBookingError && error.status === 409 && error.code === "SLOT_NOT_AVAILABLE"
  );
});

test("idempotency replay devuelve la respuesta anterior", async () => {
  const connection = new FakeBookingConnection(createFixture());

  const holdResult = await hold({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    serviceId: 10,
    startsAt: "2026-05-11T09:00:00-04:00",
    now: "2026-05-11T08:00:00-04:00"
  });

  const payload = {
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    holdToken: holdResult.holdToken
  };

  const first = await confirm({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    holdToken: holdResult.holdToken,
    idempotencyKey: "idem-replay",
    payload,
    now: "2026-05-11T08:02:00-04:00"
  });

  const claimCountAfterFirst = connection.state.claims.length;

  const second = await confirm({
    connection,
    tenantSlug: "luna-mandala",
    phoneE164: "71234567",
    holdToken: holdResult.holdToken,
    idempotencyKey: "idem-replay",
    payload,
    now: "2026-05-11T08:02:30-04:00"
  });

  assert.equal(first.responseBody.status, "confirmed");
  assert.equal(second.responseBody.replayed, true);
  assert.equal(connection.state.claims.length, claimCountAfterFirst);
});
