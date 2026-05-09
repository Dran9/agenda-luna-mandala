const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AdminAppointmentsError,
  getAdminAppointmentDetail,
  listAdminAppointments,
  updateAdminAppointmentStatus
} = require("../server/services/adminAppointments.service");

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

      if (normalizedSql.includes("SELECT COUNT(*) AS claimCount") && normalizedSql.includes("FROM appointment_resource_claims")) {
        const [centerId, appointmentId] = params;
        const claimCount = this.state.claims.filter(
          (entry) => entry.centerId === centerId && entry.appointmentId === appointmentId
        ).length;

        return [[{ claimCount }]];
      }

      if (normalizedSql.includes("UPDATE appointments") && normalizedSql.includes("SET") && normalizedSql.includes("WHERE id = ?") && normalizedSql.includes("AND center_id = ?")) {
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
    rooms: [{ id: 1, name: "Sala Luna" }],
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
    adminSession: { centerId: 1 }
  });

  assert.equal(payload.appointment.id, 200);
  assert.equal(payload.appointment.client.fullName, "Cliente Uno");
  assert.equal(payload.appointment.client.onboardingComplete, true);
  assert.equal(payload.appointment.claims.length, 1);
  assert.equal(payload.appointment.payments.length, 1);
  assert.equal(payload.appointment.paymentsSummary.totalPayments, 1);
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
