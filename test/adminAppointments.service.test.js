const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AdminAppointmentsError,
  createAdminManualAppointment,
  getAdminAppointmentDetail,
  listAdminAppointmentHistory,
  listAdminAppointments,
  updateAdminAppointmentRoom,
  updateAdminAppointmentStatus
} = require("../server/services/adminAppointments.service");
const { ValidationError } = require("../server/services/errors");

function toComparableTime(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const raw = String(value || "").trim();

  if (!raw) {
    return Number.NaN;
  }

  if (raw.includes("T")) {
    return new Date(raw).getTime();
  }

  return new Date(raw.replace(" ", "T") + "Z").getTime();
}

function toJoinedListRow(state, appointment) {
  const client = state.clients.find((entry) => entry.id === appointment.clientId);
  const service = state.services.find((entry) => entry.id === appointment.serviceId);
  const therapist = state.therapists.find((entry) => entry.id === appointment.therapistId);
  const room = state.rooms.find((entry) => entry.id === appointment.roomId);

  return {
    id: appointment.id,
    publicCode: appointment.publicCode,
    status: appointment.status,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: appointment.createdAt,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: client.whatsapp,
    serviceId: service.id,
    serviceName: service.name,
    therapistId: therapist.id,
    therapistName: therapist.name,
    roomId: room.id,
    roomName: room.name
  };
}

function toJoinedDetailRow(state, appointment) {
  const client = state.clients.find((entry) => entry.id === appointment.clientId);
  const service = state.services.find((entry) => entry.id === appointment.serviceId);
  const therapist = state.therapists.find((entry) => entry.id === appointment.therapistId);
  const room = state.rooms.find((entry) => entry.id === appointment.roomId);

  return {
    id: appointment.id,
    publicCode: appointment.publicCode,
    status: appointment.status,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: appointment.createdAt,
    holdToken: appointment.holdToken,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: client.whatsapp,
    clientFirstName: client.firstName,
    clientLastName: client.lastName,
    clientAge: client.age,
    clientCity: client.city,
    clientSource: client.source,
    clientOnboardingCompletedAt: client.onboardingCompletedAt,
    serviceId: service.id,
    serviceName: service.name,
    therapistId: therapist.id,
    therapistName: therapist.name,
    roomId: room.id,
    roomName: room.name
  };
}

function createServiceConnection(seed) {
  const state = {
    centers: (seed.centers || []).map((entry) => ({ ...entry })),
    clients: (seed.clients || []).map((entry) => ({ ...entry })),
    services: (seed.services || []).map((entry) => ({ ...entry })),
    therapists: (seed.therapists || []).map((entry) => ({ ...entry })),
    rooms: (seed.rooms || []).map((entry) => ({ ...entry })),
    serviceRooms: (seed.serviceRooms || []).map((entry) => ({ ...entry })),
    appointments: (seed.appointments || []).map((entry) => ({ ...entry })),
    claims: (seed.claims || []).map((entry) => ({ ...entry })),
    payments: (seed.payments || []).map((entry) => ({ ...entry }))
  };

  const connection = {
    state,
    _snapshot: null,
    async beginTransaction() {
      this._snapshot = JSON.parse(JSON.stringify(this.state));
    },
    async commit() {
      this._snapshot = null;
    },
    async rollback() {
      if (this._snapshot) {
        this.state = JSON.parse(JSON.stringify(this._snapshot));
        this._snapshot = null;
      }
    },
    async query(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (normalizedSql.includes("FROM centers") && normalizedSql.includes("WHERE id = ?") && normalizedSql.includes("is_active = 1") && normalizedSql.includes("LIMIT 1")) {
        if (normalizedSql.includes("AND slug = ?")) {
          const [centerId, slug] = params;
          const center = this.state.centers.find(
            (entry) => entry.id === centerId && entry.slug === slug && entry.isActive === 1
          );

          if (!center) {
            return [[]];
          }

          return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
        }

        const [centerId] = params;
        const center = this.state.centers.find((entry) => entry.id === centerId && entry.isActive === 1);

        if (!center) {
          return [[]];
        }

        return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
      }

      if (normalizedSql.includes("FROM centers") && normalizedSql.includes("WHERE slug = ?")) {
        const [slug] = params;
        const center = this.state.centers.find((entry) => entry.slug === slug && entry.isActive === 1);

        if (!center) {
          return [[]];
        }

        return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
      }

      if (normalizedSql.includes("FROM centers") && normalizedSql.includes("WHERE is_active = 1") && normalizedSql.includes("ORDER BY id ASC")) {
        const center = this.state.centers.find((entry) => entry.isActive === 1);

        if (!center) {
          return [[]];
        }

        return [[{ id: center.id, slug: center.slug, name: center.name, timezone: center.timezone }]];
      }

      if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("a.starts_at >= ?") && normalizedSql.includes("a.starts_at <= ?")) {
        const [centerId, dayStart, dayEnd, limit] = params;
        const rows = this.state.appointments
          .filter((entry) => {
            if (entry.centerId !== centerId) return false;
            const startsAt = toComparableTime(entry.startsAt);
            return startsAt >= toComparableTime(dayStart) && startsAt <= toComparableTime(dayEnd);
          })
          .sort((left, right) => toComparableTime(left.startsAt) - toComparableTime(right.startsAt) || left.id - right.id)
          .slice(0, limit)
          .map((entry) => toJoinedListRow(this.state, entry));

        return [rows];
      }

      if (
        normalizedSql.includes("FROM appointments a") &&
        normalizedSql.includes("a.ends_at <= ? OR a.status IN ('completed', 'cancelled', 'no_show')") &&
        normalizedSql.includes("ORDER BY a.starts_at") &&
        normalizedSql.includes("LIMIT ?")
      ) {
        let index = 0;
        const centerId = Number(params[index]);
        index += 1;
        const nowLimit = params[index];
        index += 1;

        let searchTerm = "";
        if (normalizedSql.includes("LOWER(c.full_name) LIKE ? OR LOWER(c.whatsapp_e164) LIKE ?")) {
          searchTerm = String(params[index] || "").toLowerCase().replaceAll("%", "");
          index += 2;
        }

        let statusFilter = "all";
        if (normalizedSql.includes("a.status = ?")) {
          statusFilter = String(params[index] || "").toLowerCase();
          index += 1;
        }

        const limit = Number(params[index]);
        const isAscOrder = normalizedSql.includes("ORDER BY a.starts_at ASC, a.id ASC");

        const rows = this.state.appointments
          .filter((entry) => {
            if (entry.centerId !== centerId) return false;

            const isPast = toComparableTime(entry.endsAt) <= toComparableTime(nowLimit);
            const isTerminal =
              entry.status === "completed" ||
              entry.status === "cancelled" ||
              entry.status === "no_show";

            if (!isPast && !isTerminal) {
              return false;
            }

            if (searchTerm) {
              const client = this.state.clients.find((item) => item.id === entry.clientId);
              const fullName = String(client?.fullName || "").toLowerCase();
              const whatsapp = String(client?.whatsapp || "").toLowerCase();
              if (!fullName.includes(searchTerm) && !whatsapp.includes(searchTerm)) {
                return false;
              }
            }

            if (statusFilter !== "all" && entry.status !== statusFilter) {
              return false;
            }

            return true;
          })
          .sort((left, right) => {
            const timeDiff = toComparableTime(left.startsAt) - toComparableTime(right.startsAt);
            if (isAscOrder) {
              return timeDiff !== 0 ? timeDiff : left.id - right.id;
            }
            return timeDiff !== 0 ? -timeDiff : right.id - left.id;
          })
          .slice(0, limit)
          .map((entry) => toJoinedListRow(this.state, entry));

        return [rows];
      }

      if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("a.starts_at > ?") && normalizedSql.includes("ORDER BY a.starts_at ASC")) {
        const [centerId, dayEnd, limit] = params;
        const rows = this.state.appointments
          .filter((entry) => {
            if (entry.centerId !== centerId) return false;
            return toComparableTime(entry.startsAt) > toComparableTime(dayEnd);
          })
          .sort((left, right) => toComparableTime(left.startsAt) - toComparableTime(right.startsAt) || left.id - right.id)
          .slice(0, limit)
          .map((entry) => toJoinedListRow(this.state, entry));

        return [rows];
      }

      if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("ORDER BY a.created_at DESC")) {
        const [centerId, limit] = params;
        const rows = this.state.appointments
          .filter((entry) => entry.centerId === centerId)
          .sort((left, right) => toComparableTime(right.createdAt) - toComparableTime(left.createdAt) || right.id - left.id)
          .slice(0, limit)
          .map((entry) => toJoinedListRow(this.state, entry));

        return [rows];
      }

      if (
        normalizedSql.includes("FROM rooms") &&
        normalizedSql.includes("WHERE center_id = ?") &&
        normalizedSql.includes("ORDER BY name ASC")
      ) {
        const rows = this.state.rooms
          .filter((entry) => entry.isActive !== 0)
          .map((entry) => ({
            id: entry.id,
            slug: entry.slug || `sala-${entry.id}`,
            name: entry.name,
            capacity: entry.capacity || 1,
            isActive: 1
          }))
          .sort((left, right) => String(left.name).localeCompare(String(right.name)));
        return [rows];
      }

      if (normalizedSql.includes("SELECT status, COUNT(*) AS total") && normalizedSql.includes("FROM appointments")) {
        const [centerId, dayStart] = params;
        const dayEnd = params.length > 2 ? params[2] : null;

        const filtered = this.state.appointments.filter((entry) => {
          if (entry.centerId !== centerId) return false;

          const startsAt = toComparableTime(entry.startsAt);
          if (startsAt < toComparableTime(dayStart)) return false;
          if (dayEnd !== null && startsAt > toComparableTime(dayEnd)) return false;

          return true;
        });

        const groups = new Map();
        for (const appointment of filtered) {
          groups.set(appointment.status, (groups.get(appointment.status) || 0) + 1);
        }

        const rows = Array.from(groups.entries()).map(([status, total]) => ({ status, total }));
        return [rows];
      }

      if (normalizedSql.includes("FROM appointments a") && normalizedSql.includes("WHERE a.center_id = ?") && normalizedSql.includes("AND a.id = ?") && normalizedSql.includes("INNER JOIN clients")) {
        const [centerId, appointmentId] = params;
        const appointment = this.state.appointments.find(
          (entry) => entry.centerId === centerId && entry.id === appointmentId
        );

        if (!appointment) {
          return [[]];
        }

        return [[toJoinedDetailRow(this.state, appointment)]];
      }

      if (
        normalizedSql.includes("FROM appointments a") &&
        normalizedSql.includes("AND a.client_id = ?") &&
        normalizedSql.includes("a.status IN ('pending', 'confirmed')") &&
        normalizedSql.includes("a.starts_at >= ?") &&
        normalizedSql.includes("ORDER BY a.starts_at ASC, a.id ASC")
      ) {
        const [centerId, clientId, startsAtMin] = params;
        const rows = this.state.appointments
          .filter((entry) => {
            if (entry.centerId !== centerId) return false;
            if (entry.clientId !== clientId) return false;
            if (entry.status !== "pending" && entry.status !== "confirmed") return false;
            return toComparableTime(entry.startsAt) >= toComparableTime(startsAtMin);
          })
          .sort((left, right) => toComparableTime(left.startsAt) - toComparableTime(right.startsAt) || left.id - right.id)
          .map((entry) => {
            const service = this.state.services.find((item) => item.id === entry.serviceId);
            const therapist = this.state.therapists.find((item) => item.id === entry.therapistId);
            const room = this.state.rooms.find((item) => item.id === entry.roomId);

            return {
              id: entry.id,
              serviceId: entry.serviceId,
              serviceName: service?.name || null,
              therapistId: entry.therapistId,
              therapistName: therapist?.displayName || therapist?.fullName || therapist?.name || null,
              roomId: entry.roomId,
              roomName: room?.name || null,
              status: entry.status,
              startsAt: entry.startsAt
            };
          });

        return [rows];
      }

      if (normalizedSql.includes("FROM appointment_resource_claims c") && normalizedSql.includes("WHERE c.center_id = ?") && normalizedSql.includes("c.appointment_id = ?")) {
        const [centerId, appointmentId] = params;
        const rows = this.state.claims
          .filter((entry) => entry.centerId === centerId && entry.appointmentId === appointmentId)
          .sort((left, right) => toComparableTime(left.claimTime) - toComparableTime(right.claimTime) || left.id - right.id)
          .map((entry) => {
            let resourceName = null;

            if (entry.resourceType === "therapist") {
              const therapist = this.state.therapists.find((item) => item.id === entry.resourceId);
              resourceName = therapist ? therapist.name : null;
            }

            if (entry.resourceType === "room") {
              const room = this.state.rooms.find((item) => item.id === entry.resourceId);
              resourceName = room ? room.name : null;
            }

            return {
              id: entry.id,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
              claimTime: entry.claimTime,
              createdAt: entry.createdAt,
              resourceName
            };
          });

        return [rows];
      }

      if (normalizedSql.includes("FROM payments") && normalizedSql.includes("WHERE center_id = ?") && normalizedSql.includes("appointment_id = ?")) {
        const [centerId, appointmentId] = params;
        const rows = this.state.payments
          .filter((entry) => entry.centerId === centerId && entry.appointmentId === appointmentId)
          .sort((left, right) => toComparableTime(right.createdAt) - toComparableTime(left.createdAt) || right.id - left.id)
          .map((entry) => ({ ...entry }));

        return [rows];
      }

      if (normalizedSql.includes("FROM service_rooms sr") && normalizedSql.includes("INNER JOIN rooms r")) {
        const [centerId, serviceId] = params;
        const rows = this.state.serviceRooms
          .filter((entry) => entry.centerId === centerId && entry.serviceId === serviceId && entry.isActive === 1)
          .map((entry) => {
            const room = this.state.rooms.find((item) => item.id === entry.roomId && item.isActive !== 0);

            if (!room) {
              return null;
            }

            return {
              roomId: room.id,
              roomName: room.name
            };
          })
          .filter(Boolean)
          .sort((left, right) => left.roomId - right.roomId);

        return [rows];
      }

      if (
        normalizedSql.includes("FROM appointment_resource_claims") &&
        normalizedSql.includes("resource_type = 'room'") &&
        normalizedSql.includes("appointment_id <> ?") &&
        normalizedSql.includes("GROUP BY resource_id")
      ) {
        const [centerId, excludedAppointmentId, startsAtDb, endsAtDb, ...roomIds] = params;
        const rows = [];

        for (const roomId of roomIds.map((entry) => Number(entry))) {
          const blockedMinutes = this.state.claims.filter((entry) => {
            if (entry.centerId !== centerId) return false;
            if (entry.resourceType !== "room") return false;
            if (entry.appointmentId === excludedAppointmentId) return false;
            if (Number(entry.resourceId) !== roomId) return false;
            const claimTime = String(entry.claimTime || "");
            return claimTime >= String(startsAtDb) && claimTime < String(endsAtDb);
          }).length;

          if (blockedMinutes > 0) {
            rows.push({
              roomId,
              blockedMinutes
            });
          }
        }

        return [rows];
      }

      if (normalizedSql.includes("FROM appointment_resource_claims") && normalizedSql.includes("resource_type AS resourceType") && normalizedSql.includes("resource_id AS resourceId") && normalizedSql.includes("claim_time AS claimTime") && normalizedSql.includes("WHERE center_id = ?") && normalizedSql.includes("AND appointment_id = ?")) {
        const [centerId, appointmentId] = params;
        const rows = this.state.claims
          .filter((entry) => entry.centerId === centerId && entry.appointmentId === appointmentId)
          .sort((left, right) => toComparableTime(left.claimTime) - toComparableTime(right.claimTime) || String(left.resourceType).localeCompare(String(right.resourceType)) || left.resourceId - right.resourceId)
          .map((entry) => ({
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            claimTime: entry.claimTime
          }));

        return [rows];
      }

      if (normalizedSql === "DELETE FROM appointment_resource_claims WHERE appointment_id = ?") {
        const [appointmentId] = params;
        this.state.claims = this.state.claims.filter((entry) => entry.appointmentId !== appointmentId);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.startsWith("INSERT INTO appointment_resource_claims")) {
        if (!params.length || params.length % 5 !== 0) {
          throw new Error("Insert claims params invalidos en test");
        }

        let nextId = this.state.claims.reduce((max, entry) => Math.max(max, Number(entry.id) || 0), 0) + 1;
        const rowsToInsert = [];

        for (let index = 0; index < params.length; index += 5) {
          const centerId = Number(params[index]);
          const appointmentId = Number(params[index + 1]);
          const resourceType = String(params[index + 2]);
          const resourceId = Number(params[index + 3]);
          const claimTime = String(params[index + 4]);

          const conflict = this.state.claims.find(
            (entry) =>
              Number(entry.centerId) === centerId &&
              String(entry.resourceType) === resourceType &&
              Number(entry.resourceId) === resourceId &&
              String(entry.claimTime) === claimTime &&
              Number(entry.appointmentId) !== appointmentId
          );

          if (conflict) {
            const duplicateError = new Error("Duplicate claim in test");
            duplicateError.code = "ER_DUP_ENTRY";
            duplicateError.errno = 1062;
            throw duplicateError;
          }

          rowsToInsert.push({
            id: nextId,
            centerId,
            appointmentId,
            resourceType,
            resourceId,
            claimTime,
            createdAt: new Date().toISOString()
          });
          nextId += 1;
        }

        this.state.claims.push(...rowsToInsert);
        return [{ affectedRows: rowsToInsert.length }];
      }

      if (normalizedSql.includes("SELECT COUNT(*) AS claimCount") && normalizedSql.includes("FROM appointment_resource_claims")) {
        const [centerId, appointmentId] = params;
        const claimCount = this.state.claims.filter(
          (entry) => entry.centerId === centerId && entry.appointmentId === appointmentId
        ).length;

        return [[{ claimCount }]];
      }

      if (
        normalizedSql.includes("UPDATE appointments") &&
        normalizedSql.includes("room_id = ?") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("AND center_id = ?")
      ) {
        const [roomId, appointmentId, centerId] = params;
        const appointment = this.state.appointments.find(
          (entry) => entry.id === appointmentId && entry.centerId === centerId
        );

        if (!appointment) {
          return [{ affectedRows: 0 }];
        }

        appointment.roomId = Number(roomId);
        appointment.updatedAt = new Date();
        return [{ affectedRows: 1 }];
      }

      if (
        normalizedSql.includes("UPDATE appointments") &&
        normalizedSql.includes("cancelled_at = CASE WHEN") &&
        normalizedSql.includes("completed_at = CASE WHEN") &&
        normalizedSql.includes("no_show_at = CASE WHEN") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("AND center_id = ?")
      ) {
        const [
          targetStatus,
          cancelledStatus,
          cancelledAt,
          completedStatus,
          completedAt,
          noShowStatus,
          noShowAt,
          clearHoldToken,
          appointmentId,
          centerId
        ] = params;

        const appointment = this.state.appointments.find(
          (entry) => entry.id === appointmentId && entry.centerId === centerId
        );

        if (!appointment) {
          return [{ affectedRows: 0 }];
        }

        appointment.status = targetStatus;

        if (cancelledStatus === "cancelled") {
          appointment.cancelledAt = cancelledAt;
        }

        if (completedStatus === "completed") {
          appointment.completedAt = completedAt;
        }

        if (noShowStatus === "no_show") {
          appointment.noShowAt = noShowAt;
        }

        if (clearHoldToken === 1) {
          appointment.holdToken = null;
        }

        appointment.updatedAt = new Date();

        return [{ affectedRows: 1 }];
      }

      throw new Error(`Query no soportada en test admin service: ${normalizedSql}`);
    }
  };

  return connection;
}

function baseSeed() {
  return {
    centers: [{ id: 1, slug: "luna-mandala", name: "Luna Mandala", timezone: "America/La_Paz", isActive: 1 }],
    clients: [
      {
        id: 1,
        fullName: "Cliente Uno",
        whatsapp: "59170000001",
        firstName: "Cliente",
        lastName: "Uno",
        age: 35,
        city: "Cochabamba",
        source: "Redes sociales",
        onboardingCompletedAt: "2026-05-07T12:00:00.000Z"
      },
      {
        id: 2,
        fullName: "Cliente Dos",
        whatsapp: "59170000002",
        firstName: "Cliente",
        lastName: "Dos",
        age: 31,
        city: "La Paz",
        source: "Otro",
        onboardingCompletedAt: "2026-05-08T12:00:00.000Z"
      }
    ],
    services: [{ id: 1, name: "Masaje Relajante" }],
    therapists: [{ id: 1, name: "Ana" }],
    rooms: [{ id: 1, name: "Sala Luna", isActive: 1 }],
    serviceRooms: [{ centerId: 1, serviceId: 1, roomId: 1, isActive: 1 }],
    appointments: [],
    claims: [],
    payments: []
  };
}

test("listAdminAppointments incluye cita creada por booking en recentCreated aunque quede fuera de today/upcoming por limite", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 100,
      centerId: 1,
      publicCode: "PUB-OLD-0001",
      status: "confirmed",
      startsAt: "2026-05-09T12:00:00.000Z",
      endsAt: "2026-05-09T13:00:00.000Z",
      createdAt: "2026-05-01T12:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 101,
      centerId: 1,
      publicCode: "PUB-BOOK-0002",
      status: "confirmed",
      startsAt: "2026-06-20T12:00:00.000Z",
      endsAt: "2026-06-20T13:00:00.000Z",
      createdAt: "2026-05-09T04:10:40.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);

  const payload = await listAdminAppointments({
    connection,
    date: "today",
    upcoming: true,
    limit: 1,
    now: new Date("2026-05-08T23:35:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.equal(payload.today.length, 0);
  assert.equal(payload.upcoming.length, 1);
  assert.equal(payload.upcoming[0].id, 100);

  assert.equal(payload.recentCreated.length, 1);
  assert.equal(payload.recentCreated[0].id, 101);
  assert.equal(payload.recentCreated[0].publicCode, "PUB-BOOK-0002");
  assert.equal(payload.recentCreated[0].client.fullName, "Cliente Dos");
  assert.equal(payload.recentCreated[0].service.name, "Masaje Relajante");
  assert.equal(payload.recentCreated[0].therapist.name, "Ana");
  assert.equal(payload.recentCreated[0].room.name, "Sala Luna");
  assert.equal(payload.recentCreated[0].status, "confirmed");
});

test("listAdminAppointments filtra roomsActive por estados activos y end_at > ahora", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 150,
      centerId: 1,
      publicCode: "PUB-ROOMS-150",
      status: "confirmed",
      startsAt: "2026-05-08T11:00:00.000Z",
      endsAt: "2026-05-08T12:30:00.000Z",
      createdAt: "2026-05-08T09:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 151,
      centerId: 1,
      publicCode: "PUB-ROOMS-151",
      status: "confirmed",
      startsAt: "2026-05-08T10:00:00.000Z",
      endsAt: "2026-05-08T12:00:00.000Z",
      createdAt: "2026-05-08T08:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 152,
      centerId: 1,
      publicCode: "PUB-ROOMS-152",
      status: "cancelled",
      startsAt: "2026-05-08T13:00:00.000Z",
      endsAt: "2026-05-08T14:00:00.000Z",
      createdAt: "2026-05-08T07:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);
  const payload = await listAdminAppointments({
    connection,
    date: "today",
    upcoming: true,
    limit: 20,
    now: new Date("2026-05-08T12:00:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.deepEqual(payload.roomsActive.map((entry) => entry.id), [150]);
});

test("listAdminAppointmentHistory incluye cita pasada y excluye cita futura activa", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 200,
      centerId: 1,
      publicCode: "PUB-HISTORY-200",
      status: "completed",
      startsAt: "2026-05-06T10:00:00.000Z",
      endsAt: "2026-05-06T11:00:00.000Z",
      createdAt: "2026-05-05T10:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 201,
      centerId: 1,
      publicCode: "PUB-HISTORY-201",
      status: "confirmed",
      startsAt: "2026-05-20T10:00:00.000Z",
      endsAt: "2026-05-20T11:00:00.000Z",
      createdAt: "2026-05-05T11:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);
  const payload = await listAdminAppointmentHistory({
    connection,
    now: new Date("2026-05-10T12:00:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.equal(payload.history.some((entry) => entry.id === 200), true);
  assert.equal(payload.history.some((entry) => entry.id === 201), false);
});

test("listAdminAppointmentHistory aplica filtros basicos y ordena por fecha descendente por defecto", async () => {
  const seed = baseSeed();
  seed.clients = [
    {
      id: 1,
      fullName: "Mara Uno",
      whatsapp: "59171111111",
      firstName: "Mara",
      lastName: "Uno",
      age: 35,
      city: "Cochabamba",
      source: "Redes sociales",
      onboardingCompletedAt: "2026-05-07T12:00:00.000Z"
    },
    {
      id: 2,
      fullName: "Mara Dos",
      whatsapp: "59172222222",
      firstName: "Mara",
      lastName: "Dos",
      age: 31,
      city: "La Paz",
      source: "Otro",
      onboardingCompletedAt: "2026-05-08T12:00:00.000Z"
    }
  ];
  seed.appointments = [
    {
      id: 300,
      centerId: 1,
      publicCode: "PUB-HISTORY-300",
      status: "completed",
      startsAt: "2026-05-08T12:00:00.000Z",
      endsAt: "2026-05-08T13:00:00.000Z",
      createdAt: "2026-05-06T11:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 301,
      centerId: 1,
      publicCode: "PUB-HISTORY-301",
      status: "completed",
      startsAt: "2026-05-07T12:00:00.000Z",
      endsAt: "2026-05-07T13:00:00.000Z",
      createdAt: "2026-05-06T10:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    },
    {
      id: 302,
      centerId: 1,
      publicCode: "PUB-HISTORY-302",
      status: "cancelled",
      startsAt: "2026-05-09T12:00:00.000Z",
      endsAt: "2026-05-09T13:00:00.000Z",
      createdAt: "2026-05-06T09:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);

  const filteredPayload = await listAdminAppointmentHistory({
    connection,
    q: "711111",
    status: "completed",
    now: new Date("2026-05-10T12:00:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.deepEqual(filteredPayload.history.map((entry) => entry.id), [300, 301]);
  assert.deepEqual(filteredPayload.history.map((entry) => entry.status), ["completed", "completed"]);

  const defaultOrderPayload = await listAdminAppointmentHistory({
    connection,
    now: new Date("2026-05-10T12:00:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.deepEqual(defaultOrderPayload.history.map((entry) => entry.id), [302, 300, 301]);
});

test("getAdminAppointmentDetail devuelve joins reales, claims y pagos", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 200,
      centerId: 1,
      publicCode: "PUB-DETAIL-200",
      status: "confirmed",
      startsAt: "2026-05-09T14:00:00.000Z",
      endsAt: "2026-05-09T15:00:00.000Z",
      createdAt: "2026-05-09T11:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];
  seed.claims = [
    {
      id: 1,
      centerId: 1,
      appointmentId: 200,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-09T14:00:00.000Z",
      createdAt: "2026-05-09T11:00:01.000Z"
    }
  ];
  seed.payments = [
    {
      id: 9,
      centerId: 1,
      appointmentId: 200,
      status: "pending",
      amount: 120,
      currencyCode: "BOB",
      method: "transfer",
      proofFileId: null,
      reviewedByAdminUserId: null,
      reviewedAt: null,
      notes: null,
      createdAt: "2026-05-09T11:30:00.000Z",
      updatedAt: "2026-05-09T11:30:00.000Z"
    }
  ];

  const connection = createServiceConnection(seed);

  const payload = await getAdminAppointmentDetail({
    connection,
    appointmentId: 200,
    now: new Date("2026-05-09T13:00:00.000Z"),
    adminSession: { centerId: 1 }
  });

  assert.equal(payload.appointment.id, 200);
  assert.equal(payload.appointment.client.fullName, "Cliente Uno");
  assert.equal(payload.appointment.client.onboardingComplete, true);
  assert.equal(payload.appointment.claims.length, 1);
  assert.equal(payload.appointment.payments.length, 1);
  assert.equal(payload.appointment.paymentsSummary.totalPayments, 1);
  assert.equal(payload.appointment.clientContext.activeAppointments.length, 1);
  assert.equal(payload.appointment.roomOptions.length, 1);
  assert.equal(payload.appointment.roomOptions[0].available, true);
});

test("createAdminManualAppointment usa hold+confirm compartidos y source admin_manual", async () => {
  const updates = [];
  const connection = {
    async query(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (
        normalizedSql.includes("FROM centers") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("is_active = 1") &&
        normalizedSql.includes("LIMIT 1")
      ) {
        return [[{ id: 1, slug: "demo", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      if (
        normalizedSql.startsWith("UPDATE clients") &&
        normalizedSql.includes("SET full_name = ?") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("AND center_id = ?")
      ) {
        updates.push({
          fullName: params[0],
          clientId: Number(params[1]),
          centerId: Number(params[2])
        });
        return [{ affectedRows: 1 }];
      }

      throw new Error(`SQL no esperado en test: ${normalizedSql}`);
    }
  };

  let holdCall = null;
  let confirmCall = null;
  const payload = await createAdminManualAppointment({
    connection,
    adminSession: { centerId: 1 },
    phoneE164: "59171234567",
    clientFullName: "Lia Luna",
    serviceId: "2",
    therapistId: "5",
    roomId: "3",
    startsAt: "2026-05-30T10:00:00.000Z",
    now: new Date("2026-05-12T12:00:00.000Z"),
    createHold: async (args) => {
      holdCall = args;
      return {
        appointmentId: 2001,
        publicCode: "PUB-2001",
        startsAt: "2026-05-30T10:00:00.000Z",
        endsAt: "2026-05-30T11:00:00.000Z",
        client: { id: 41 }
      };
    },
    confirmStatus: async (args) => {
      confirmCall = args;
      return {
        appointment: {
          id: 2001,
          status: "confirmed"
        }
      };
    }
  });

  assert.equal(holdCall.centerId, 1);
  assert.equal(holdCall.phoneE164, "59171234567");
  assert.equal(holdCall.serviceId, 2);
  assert.equal(holdCall.therapistId, 5);
  assert.equal(holdCall.roomId, 3);
  assert.equal(holdCall.source, "admin_manual");
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0], {
    fullName: "Lia Luna",
    clientId: 41,
    centerId: 1
  });
  assert.equal(confirmCall.appointmentId, 2001);
  assert.equal(confirmCall.status, "confirmed");
  assert.equal(confirmCall.adminSession.centerId, 1);
  assert.equal(payload.creation.mode, "admin_manual");
  assert.equal(payload.creation.appointmentId, 2001);
  assert.equal(payload.appointment.status, "confirmed");
});

test("createAdminManualAppointment rechaza startsAt pasado", async () => {
  const connection = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (
        normalizedSql.includes("FROM centers") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("is_active = 1") &&
        normalizedSql.includes("LIMIT 1")
      ) {
        return [[{ id: 1, slug: "demo", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      throw new Error(`SQL no esperado en test: ${normalizedSql}`);
    }
  };

  await assert.rejects(
    createAdminManualAppointment({
      connection,
      adminSession: { centerId: 1 },
      phoneE164: "59171234567",
      serviceId: "1",
      startsAt: "2026-05-10T10:00:00.000Z",
      now: new Date("2026-05-12T12:00:00.000Z"),
      createHold: async () => {
        throw new Error("no deberia intentar hold");
      }
    }),
    (error) => {
      assert.equal(error instanceof ValidationError, true);
      assert.equal(error.details.field, "startsAt");
      return true;
    }
  );
});

test("createAdminManualAppointment acepta 71234567 y normaliza a 59171234567", async () => {
  const connection = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (
        normalizedSql.includes("FROM centers") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("is_active = 1") &&
        normalizedSql.includes("LIMIT 1")
      ) {
        return [[{ id: 1, slug: "demo", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      throw new Error(`SQL no esperado en test: ${normalizedSql}`);
    }
  };

  let holdCall = null;
  await createAdminManualAppointment({
    connection,
    adminSession: { centerId: 1 },
    phoneE164: "71234567",
    serviceId: "1",
    startsAt: "2026-05-30T10:00:00.000Z",
    now: new Date("2026-05-12T12:00:00.000Z"),
    createHold: async (args) => {
      holdCall = args;
      return {
        appointmentId: 2002,
        publicCode: "PUB-2002",
        startsAt: "2026-05-30T10:00:00.000Z",
        endsAt: "2026-05-30T11:00:00.000Z",
        client: { id: 51 }
      };
    },
    confirmStatus: async () => ({
      appointment: {
        id: 2002,
        status: "confirmed"
      }
    })
  });

  assert.equal(holdCall.phoneE164, "59171234567");
});

test("createAdminManualAppointment rechaza 59110000000 por formato Bolivia invalido", async () => {
  const connection = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (
        normalizedSql.includes("FROM centers") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("is_active = 1") &&
        normalizedSql.includes("LIMIT 1")
      ) {
        return [[{ id: 1, slug: "demo", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      throw new Error(`SQL no esperado en test: ${normalizedSql}`);
    }
  };

  await assert.rejects(
    createAdminManualAppointment({
      connection,
      adminSession: { centerId: 1 },
      phoneE164: "59110000000",
      serviceId: "1",
      startsAt: "2026-05-30T10:00:00.000Z",
      now: new Date("2026-05-12T12:00:00.000Z"),
      createHold: async () => {
        throw new Error("no deberia intentar hold");
      }
    }),
    (error) => {
      assert.equal(error instanceof ValidationError, true);
      assert.equal(error.details.field, "phoneE164");
      assert.equal(error.details.country, "BO");
      return true;
    }
  );
});

test("createAdminManualAppointment rechaza 10000000 por formato Bolivia invalido", async () => {
  const connection = {
    async query(sql) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (
        normalizedSql.includes("FROM centers") &&
        normalizedSql.includes("WHERE id = ?") &&
        normalizedSql.includes("is_active = 1") &&
        normalizedSql.includes("LIMIT 1")
      ) {
        return [[{ id: 1, slug: "demo", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      throw new Error(`SQL no esperado en test: ${normalizedSql}`);
    }
  };

  await assert.rejects(
    createAdminManualAppointment({
      connection,
      adminSession: { centerId: 1 },
      phoneE164: "10000000",
      serviceId: "1",
      startsAt: "2026-05-30T10:00:00.000Z",
      now: new Date("2026-05-12T12:00:00.000Z"),
      createHold: async () => {
        throw new Error("no deberia intentar hold");
      }
    }),
    (error) => {
      assert.equal(error instanceof ValidationError, true);
      assert.equal(error.details.field, "phoneE164");
      assert.equal(error.details.country, "BO");
      return true;
    }
  );
});

test("state machine: pending -> confirmed conserva claims existentes", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 300,
      centerId: 1,
      publicCode: "PUB-PENDING-300",
      status: "pending",
      startsAt: "2026-05-10T10:00:00-04:00",
      endsAt: "2026-05-10T10:02:00-04:00",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: "hold-300"
    }
  ];
  seed.claims = [
    {
      id: 5,
      centerId: 1,
      appointmentId: 300,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10 10:00:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 6,
      centerId: 1,
      appointmentId: 300,
      resourceType: "room",
      resourceId: 1,
      claimTime: "2026-05-10 10:00:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 7,
      centerId: 1,
      appointmentId: 300,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10 10:01:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 8,
      centerId: 1,
      appointmentId: 300,
      resourceType: "room",
      resourceId: 1,
      claimTime: "2026-05-10 10:01:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    }
  ];

  const connection = createServiceConnection(seed);
  let createClaimsCalls = 0;

  const payload = await updateAdminAppointmentStatus({
    connection,
    appointmentId: 300,
    status: "confirmed",
    adminSession: { centerId: 1 },
    createClaims: async () => {
      createClaimsCalls += 1;
      return { claimsCreated: 0 };
    },
    releaseClaims: async () => ({ claimsReleased: 0 })
  });

  assert.equal(payload.transition.from, "pending");
  assert.equal(payload.transition.to, "confirmed");
  assert.equal(payload.transition.claims.action, "preserved");
  assert.equal(createClaimsCalls, 0);
  assert.equal(connection.state.appointments[0].status, "confirmed");
  assert.equal(connection.state.appointments[0].holdToken, null);
});

test("state machine: pending -> confirmed con claims parciales reconstruye", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 305,
      centerId: 1,
      publicCode: "PUB-PENDING-305",
      status: "pending",
      startsAt: "2026-05-10T11:00:00.000Z",
      endsAt: "2026-05-10T11:02:00.000Z",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: "hold-305"
    }
  ];
  seed.claims = [
    {
      id: 15,
      centerId: 1,
      appointmentId: 305,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10T11:00:00.000Z",
      createdAt: "2026-05-09T18:00:01.000Z"
    }
  ];

  const connection = createServiceConnection(seed);
  let createClaimsCalls = 0;

  const payload = await updateAdminAppointmentStatus({
    connection,
    appointmentId: 305,
    status: "confirmed",
    adminSession: { centerId: 1 },
    createClaims: async () => {
      createClaimsCalls += 1;
      return { claimsCreated: 4 };
    },
    releaseClaims: async () => ({ claimsReleased: 0 })
  });

  assert.equal(payload.transition.claims.action, "recreated");
  assert.equal(payload.transition.claims.created, 4);
  assert.equal(createClaimsCalls, 1);
});

test("state machine: pending -> confirmed con misma cantidad de claims pero contenido incorrecto reconstruye", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 306,
      centerId: 1,
      publicCode: "PUB-PENDING-306",
      status: "pending",
      startsAt: "2026-05-10T13:00:00-04:00",
      endsAt: "2026-05-10T13:02:00-04:00",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: "hold-306"
    }
  ];
  seed.claims = [
    {
      id: 40,
      centerId: 1,
      appointmentId: 306,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10 13:00:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 41,
      centerId: 1,
      appointmentId: 306,
      resourceType: "room",
      resourceId: 999,
      claimTime: "2026-05-10 13:00:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 42,
      centerId: 1,
      appointmentId: 306,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10 13:01:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    },
    {
      id: 43,
      centerId: 1,
      appointmentId: 306,
      resourceType: "room",
      resourceId: 1,
      claimTime: "2026-05-10 13:01:00",
      createdAt: "2026-05-09T18:00:01.000Z"
    }
  ];

  const connection = createServiceConnection(seed);
  let createClaimsCalls = 0;
  let receivedManageTransaction = null;

  const payload = await updateAdminAppointmentStatus({
    connection,
    appointmentId: 306,
    status: "confirmed",
    adminSession: { centerId: 1 },
    createClaims: async ({ manageTransaction }) => {
      createClaimsCalls += 1;
      receivedManageTransaction = manageTransaction;
      return { claimsCreated: 4 };
    },
    releaseClaims: async () => ({ claimsReleased: 0 })
  });

  assert.equal(payload.transition.claims.action, "recreated");
  assert.equal(payload.transition.claims.created, 4);
  assert.equal(createClaimsCalls, 1);
  assert.equal(receivedManageTransaction, false);
});

test("state machine: pending -> confirmed sin claims recrea", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 301,
      centerId: 1,
      publicCode: "PUB-PENDING-301",
      status: "pending",
      startsAt: "2026-05-10T12:00:00.000Z",
      endsAt: "2026-05-10T12:02:00.000Z",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: "hold-301"
    }
  ];

  const connection = createServiceConnection(seed);

  const payload = await updateAdminAppointmentStatus({
    connection,
    appointmentId: 301,
    status: "confirmed",
    adminSession: { centerId: 1 },
    createClaims: async ({ appointment }) => {
      connection.state.claims = connection.state.claims.filter(
        (entry) => entry.appointmentId !== appointment.appointmentId
      );
      connection.state.claims.push({
        id: 20,
        centerId: appointment.centerId,
        appointmentId: appointment.appointmentId,
        resourceType: "therapist",
        resourceId: appointment.therapistId,
        claimTime: "2026-05-10T12:00:00.000Z",
        createdAt: "2026-05-09T18:01:00.000Z"
      });
      connection.state.claims.push({
        id: 21,
        centerId: appointment.centerId,
        appointmentId: appointment.appointmentId,
        resourceType: "room",
        resourceId: appointment.roomId,
        claimTime: "2026-05-10T12:00:00.000Z",
        createdAt: "2026-05-09T18:01:00.000Z"
      });
      connection.state.claims.push({
        id: 22,
        centerId: appointment.centerId,
        appointmentId: appointment.appointmentId,
        resourceType: "therapist",
        resourceId: appointment.therapistId,
        claimTime: "2026-05-10T12:01:00.000Z",
        createdAt: "2026-05-09T18:01:00.000Z"
      });
      connection.state.claims.push({
        id: 23,
        centerId: appointment.centerId,
        appointmentId: appointment.appointmentId,
        resourceType: "room",
        resourceId: appointment.roomId,
        claimTime: "2026-05-10T12:01:00.000Z",
        createdAt: "2026-05-09T18:01:00.000Z"
      });
      return { claimsCreated: 4 };
    },
    releaseClaims: async () => ({ claimsReleased: 0 })
  });

  assert.equal(payload.transition.claims.action, "recreated");
  assert.equal(payload.transition.claims.created, 4);
  assert.equal(connection.state.claims.length, 4);
  assert.equal(payload.appointment.claims.length, 4);
});

test("state machine: confirmed -> completed libera claims terminales", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 302,
      centerId: 1,
      publicCode: "PUB-CONF-302",
      status: "confirmed",
      startsAt: "2026-05-10T15:00:00.000Z",
      endsAt: "2026-05-10T16:00:00.000Z",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];
  seed.claims = [
    {
      id: 30,
      centerId: 1,
      appointmentId: 302,
      resourceType: "therapist",
      resourceId: 1,
      claimTime: "2026-05-10T15:00:00.000Z",
      createdAt: "2026-05-09T18:00:01.000Z"
    }
  ];

  const connection = createServiceConnection(seed);

  const payload = await updateAdminAppointmentStatus({
    connection,
    appointmentId: 302,
    status: "completed",
    adminSession: { centerId: 1 },
    createClaims: async () => ({ claimsCreated: 0 }),
    releaseClaims: async ({ appointmentId }) => {
      const before = connection.state.claims.length;
      connection.state.claims = connection.state.claims.filter((entry) => entry.appointmentId !== appointmentId);
      return { claimsReleased: before - connection.state.claims.length };
    }
  });

  assert.equal(payload.transition.claims.action, "released");
  assert.equal(payload.transition.claims.released, 1);
  assert.equal(connection.state.claims.length, 0);
  assert.equal(payload.appointment.claims.length, 0);
  assert.equal(connection.state.appointments[0].status, "completed");
});

test("state machine: transicion invalida retorna conflicto", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 303,
      centerId: 1,
      publicCode: "PUB-CONF-303",
      status: "confirmed",
      startsAt: "2026-05-10T18:00:00.000Z",
      endsAt: "2026-05-10T19:00:00.000Z",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);

  await assert.rejects(
    updateAdminAppointmentStatus({
      connection,
      appointmentId: 303,
      status: "pending",
      adminSession: { centerId: 1 }
    }),
    (error) => {
      assert.equal(error instanceof AdminAppointmentsError, true);
      assert.equal(error.code, "APPOINTMENT_STATUS_TRANSITION_INVALID");
      assert.equal(error.status, 409);
      return true;
    }
  );
});

test("state machine: estado terminal no se reactiva", async () => {
  const seed = baseSeed();
  seed.appointments = [
    {
      id: 304,
      centerId: 1,
      publicCode: "PUB-DONE-304",
      status: "completed",
      startsAt: "2026-05-10T20:00:00.000Z",
      endsAt: "2026-05-10T21:00:00.000Z",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 2,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];

  const connection = createServiceConnection(seed);

  await assert.rejects(
    updateAdminAppointmentStatus({
      connection,
      appointmentId: 304,
      status: "confirmed",
      adminSession: { centerId: 1 }
    }),
    (error) => {
      assert.equal(error instanceof AdminAppointmentsError, true);
      assert.equal(error.code, "APPOINTMENT_STATUS_TRANSITION_INVALID");
      assert.equal(error.status, 409);
      return true;
    }
  );
});

test("room change: confirmed permite cambiar a sala disponible y recrea claims", async () => {
  const seed = baseSeed();
  seed.rooms = [
    { id: 1, name: "Sala Luna", isActive: 1 },
    { id: 2, name: "Sala Sol", isActive: 1 }
  ];
  seed.serviceRooms = [
    { centerId: 1, serviceId: 1, roomId: 1, isActive: 1 },
    { centerId: 1, serviceId: 1, roomId: 2, isActive: 1 }
  ];
  seed.appointments = [
    {
      id: 401,
      centerId: 1,
      publicCode: "PUB-ROOM-401",
      status: "confirmed",
      startsAt: "2026-05-10T10:00:00-04:00",
      endsAt: "2026-05-10T10:02:00-04:00",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];
  seed.claims = [
    { id: 61, centerId: 1, appointmentId: 401, resourceType: "therapist", resourceId: 1, claimTime: "2026-05-10 10:00:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 62, centerId: 1, appointmentId: 401, resourceType: "room", resourceId: 1, claimTime: "2026-05-10 10:00:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 63, centerId: 1, appointmentId: 401, resourceType: "therapist", resourceId: 1, claimTime: "2026-05-10 10:01:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 64, centerId: 1, appointmentId: 401, resourceType: "room", resourceId: 1, claimTime: "2026-05-10 10:01:00", createdAt: "2026-05-09T18:00:01.000Z" }
  ];

  const connection = createServiceConnection(seed);
  const payload = await updateAdminAppointmentRoom({
    connection,
    appointmentId: 401,
    roomId: 2,
    adminSession: { centerId: 1 }
  });

  assert.equal(payload.roomChange.fromRoomId, 1);
  assert.equal(payload.roomChange.toRoomId, 2);
  assert.equal(payload.appointment.room.id, 2);
  assert.equal(connection.state.appointments[0].roomId, 2);
  assert.equal(connection.state.claims.filter((entry) => entry.appointmentId === 401 && entry.resourceType === "room").every((entry) => entry.resourceId === 2), true);
});

test("room change: sala ocupada devuelve ROOM_NOT_AVAILABLE", async () => {
  const seed = baseSeed();
  seed.rooms = [
    { id: 1, name: "Sala Luna", isActive: 1 },
    { id: 2, name: "Sala Sol", isActive: 1 }
  ];
  seed.serviceRooms = [
    { centerId: 1, serviceId: 1, roomId: 1, isActive: 1 },
    { centerId: 1, serviceId: 1, roomId: 2, isActive: 1 }
  ];
  seed.appointments = [
    {
      id: 402,
      centerId: 1,
      publicCode: "PUB-ROOM-402",
      status: "confirmed",
      startsAt: "2026-05-10T11:00:00-04:00",
      endsAt: "2026-05-10T11:02:00-04:00",
      createdAt: "2026-05-09T18:00:00.000Z",
      clientId: 1,
      serviceId: 1,
      therapistId: 1,
      roomId: 1,
      holdToken: null
    }
  ];
  seed.claims = [
    { id: 71, centerId: 1, appointmentId: 402, resourceType: "therapist", resourceId: 1, claimTime: "2026-05-10 11:00:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 72, centerId: 1, appointmentId: 402, resourceType: "room", resourceId: 1, claimTime: "2026-05-10 11:00:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 73, centerId: 1, appointmentId: 5000, resourceType: "room", resourceId: 2, claimTime: "2026-05-10 11:00:00", createdAt: "2026-05-09T18:00:01.000Z" },
    { id: 74, centerId: 1, appointmentId: 5000, resourceType: "room", resourceId: 2, claimTime: "2026-05-10 11:01:00", createdAt: "2026-05-09T18:00:01.000Z" }
  ];

  const connection = createServiceConnection(seed);

  await assert.rejects(
    updateAdminAppointmentRoom({
      connection,
      appointmentId: 402,
      roomId: 2,
      adminSession: { centerId: 1 }
    }),
    (error) => {
      assert.equal(error instanceof AdminAppointmentsError, true);
      assert.equal(error.code, "ROOM_NOT_AVAILABLE");
      assert.equal(error.status, 409);
      return true;
    }
  );
});
