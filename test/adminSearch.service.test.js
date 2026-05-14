const assert = require("node:assert/strict");
const test = require("node:test");

const { searchAdmin } = require("../server/services/adminSearch.service");
const { ValidationError } = require("../server/services/errors");

const ADMIN_SESSION = {
  adminId: 1,
  centerId: 7,
  email: "admin.dev@lunamandala.local",
  role: "owner"
};

const NOW = new Date("2026-05-08T15:00:00.000Z");

function createConnectionMock(handler) {
  return {
    queryLog: [],
    async query(sql, params = []) {
      this.queryLog.push({ sql, params: [...params] });
      const result = await handler({ sql, params, log: this.queryLog });
      return [result, []];
    }
  };
}

function centerRows() {
  return [
    {
      id: 7,
      slug: "luna-mandala",
      name: "Luna Mandala",
      timezone: "America/La_Paz"
    }
  ];
}

test("searchAdmin requires centerId from session", async () => {
  const connection = createConnectionMock(async () => []);

  await assert.rejects(
    async () => {
      await searchAdmin({
        connection,
        adminSession: { adminId: 1, centerId: null, role: "owner" },
        q: "",
        type: "all",
        limit: 5,
        now: NOW
      });
    },
    (error) => error instanceof ValidationError
  );
});

test("searchAdmin rejects invalid type", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    return [];
  });

  await assert.rejects(
    async () => {
      await searchAdmin({
        connection,
        adminSession: ADMIN_SESSION,
        q: "",
        type: "team",
        limit: 5,
        now: NOW
      });
    },
    (error) => error instanceof ValidationError && error.details.field === "type"
  );
});

test("searchAdmin rejects invalid limit", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    return [];
  });

  await assert.rejects(
    async () => {
      await searchAdmin({
        connection,
        adminSession: ADMIN_SESSION,
        q: "",
        type: "all",
        limit: 9999,
        now: NOW
      });
    },
    (error) => error instanceof ValidationError && error.details.field === "limit"
  );
});

test("searchAdmin scopes queries by centerId", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM clients")) {
      return [];
    }
    if (sql.includes("FROM appointments a")) {
      return [];
    }
    if (sql.includes("FROM rooms r")) {
      return [];
    }
    return [];
  });

  await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "",
    type: "all",
    limit: 5,
    now: NOW
  });

  const otherCenterParam = connection.queryLog.find((entry) =>
    entry.params.includes(99)
  );
  assert.equal(otherCenterParam, undefined);

  for (const entry of connection.queryLog.slice(1)) {
    assert.equal(
      entry.params.includes(7),
      true,
      `query ${entry.sql.slice(0, 40)} debe filtrar por centerId 7`
    );
  }
});

test("searchAdmin builds client result with onboarding/whatsapp", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM clients")) {
      return [
        {
          id: 22,
          fullName: "Lia Solis",
          whatsapp: "+59170000020",
          onboardingComplete: 1,
          nextAppointmentId: 41,
          nextAppointmentStartsAt: "2026-05-10 18:00:00",
          nextAppointmentPublicCode: "PUB-XXXX"
        }
      ];
    }
    return [];
  });

  const payload = await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "lia",
    type: "clients",
    limit: 5,
    now: NOW
  });

  assert.equal(payload.results.length, 1);
  const result = payload.results[0];
  assert.equal(result.id, "client:22");
  assert.equal(result.type, "client");
  assert.equal(result.entityId, 22);
  assert.equal(result.title, "Lia Solis");
  assert.match(result.subtitle, /\+59170000020/);
  assert.match(result.subtitle, /Onboarding completo/);
  assert.equal(result.action.kind, "openClient");
  assert.equal(result.action.clientId, 22);
  assert.equal(result.extras.nextAppointment.publicCode, "PUB-XXXX");
});

test("searchAdmin filters cases by status pending/no_show/cancelled", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM appointments a")) {
      return [
        {
          id: 1,
          publicCode: "PUB-1",
          status: "pending",
          startsAt: "2026-05-09 10:00:00",
          endsAt: "2026-05-09 11:00:00",
          clientId: 10,
          clientName: "Cliente Pending",
          clientPhone: "+59170000001",
          serviceId: 1,
          serviceName: "Reiki",
          therapistId: 1,
          therapistName: "Orion",
          roomId: 1,
          roomName: "Luna"
        },
        {
          id: 2,
          publicCode: "PUB-2",
          status: "completed",
          startsAt: "2026-05-09 12:00:00",
          endsAt: "2026-05-09 13:00:00",
          clientId: 11,
          clientName: "Cliente Completed",
          clientPhone: "+59170000002",
          serviceId: 1,
          serviceName: "Reiki",
          therapistId: 1,
          therapistName: "Orion",
          roomId: 1,
          roomName: "Luna"
        },
        {
          id: 3,
          publicCode: "PUB-3",
          status: "no_show",
          startsAt: "2026-05-09 14:00:00",
          endsAt: "2026-05-09 15:00:00",
          clientId: 12,
          clientName: "Cliente NoShow",
          clientPhone: "+59170000003",
          serviceId: 1,
          serviceName: "Reiki",
          therapistId: 1,
          therapistName: "Orion",
          roomId: 1,
          roomName: "Luna"
        }
      ];
    }
    return [];
  });

  const payload = await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "",
    type: "cases",
    limit: 10,
    now: NOW
  });

  assert.equal(payload.results.length, 2);
  for (const result of payload.results) {
    assert.equal(result.type, "case");
    assert.notEqual(result.extras.status, "completed");
  }
});

test("searchAdmin hides publicCode from appointment result meta", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM appointments a")) {
      return [
        {
          id: 50,
          publicCode: "PUB-1234",
          status: "confirmed",
          startsAt: "2026-05-09 19:30:00",
          endsAt: "2026-05-09 20:30:00",
          clientId: 10,
          clientName: "Lia Solis",
          clientPhone: "+59170000020",
          serviceId: 1,
          serviceName: "Sanacion Reiki",
          therapistId: 1,
          therapistName: "Orion Inti",
          roomId: 1,
          roomName: "Luna"
        }
      ];
    }
    return [];
  });

  const payload = await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "PUB-1234",
    type: "appointments",
    limit: 5,
    now: NOW
  });

  assert.equal(payload.results.length, 1);
  const result = payload.results[0];
  assert.equal(result.type, "appointment");
  assert.equal(result.action.kind, "openAppointment");
  assert.equal(result.action.appointmentId, 50);
  assert.notEqual(result.meta, "PUB-1234");
  assert.match(result.meta, /2026-05-09/);
  assert.match(result.subtitle, /Sanacion Reiki/);
});

test("searchAdmin returns rooms with ocupacion hoy", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM rooms r")) {
      return [
        {
          id: 1,
          name: "Luna",
          todayCount: 4,
          nextStartsAt: "2026-05-09 19:00:00",
          nextPublicCode: "PUB-NEXT"
        }
      ];
    }
    return [];
  });

  const payload = await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "luna",
    type: "rooms",
    limit: 5,
    now: NOW
  });

  assert.equal(payload.results.length, 1);
  const result = payload.results[0];
  assert.equal(result.type, "room");
  assert.equal(result.action.kind, "openRooms");
  assert.equal(result.action.roomId, 1);
  assert.match(result.subtitle, /4 citas hoy/);
});

test("searchAdmin returns suggestions when query is empty", async () => {
  const connection = createConnectionMock(async ({ sql }) => {
    if (sql.includes("FROM centers")) {
      return centerRows();
    }
    if (sql.includes("FROM clients")) {
      return [
        {
          id: 1,
          fullName: "Cliente Reciente",
          whatsapp: "+59170000099",
          onboardingComplete: 0,
          nextAppointmentId: null,
          nextAppointmentStartsAt: null,
          nextAppointmentPublicCode: null
        }
      ];
    }
    if (sql.includes("FROM appointments a")) {
      return [
        {
          id: 100,
          publicCode: "PUB-FUTURE",
          status: "confirmed",
          startsAt: "2026-05-09 09:00:00",
          endsAt: "2026-05-09 10:00:00",
          clientId: 1,
          clientName: "Cliente Reciente",
          clientPhone: "+59170000099",
          serviceId: 1,
          serviceName: "Reiki",
          therapistId: 1,
          therapistName: "Orion",
          roomId: 1,
          roomName: "Luna"
        }
      ];
    }
    if (sql.includes("FROM rooms r")) {
      return [
        {
          id: 1,
          name: "Luna",
          todayCount: 1,
          nextStartsAt: null,
          nextPublicCode: null
        }
      ];
    }
    return [];
  });

  const payload = await searchAdmin({
    connection,
    adminSession: ADMIN_SESSION,
    q: "",
    type: "all",
    limit: 5,
    now: NOW
  });

  assert.equal(payload.query.q, "");
  assert.equal(payload.query.type, "all");
  assert.ok(payload.groups.appointments.length === 1);
  assert.ok(payload.groups.clients.length === 1);
  assert.ok(payload.groups.rooms.length === 1);
});
