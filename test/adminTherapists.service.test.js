const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getAdminTherapistDetail,
  listAdminTherapists,
  updateAdminTherapistAvailability,
  updateAdminTherapistProfile,
  updateAdminTherapistService
} = require("../server/services/adminTherapists.service");

function createScriptedConnection(steps) {
  const scriptedSteps = [...steps];
  let callIndex = 0;

  return {
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      const step = scriptedSteps[callIndex];

      if (!step) {
        throw new Error(`Query no esperada #${callIndex + 1}: ${normalizedSql}`);
      }

      if (step.includes) {
        assert.equal(
          normalizedSql.includes(step.includes),
          true,
          `Falta \"${step.includes}\" en query #${callIndex + 1}`
        );
      }

      if (step.assert) {
        step.assert({ sql: normalizedSql, params });
      }

      callIndex += 1;
      if (step.resultSets) {
        return [step.resultSets];
      }

      return [step.rows || []];
    },
    assertDone() {
      assert.equal(callIndex, scriptedSteps.length, "No se consumieron todos los pasos");
    }
  };
}

function assertNoForbiddenStatusLiterals(payload) {
  const raw = JSON.stringify(payload);
  const forbidden = ["Confirmada", "Pendiente", "Cancelada", "Completada", "No-show", "No show"];

  for (const item of forbidden) {
    assert.equal(raw.includes(item), false, `Se encontro literal prohibido: ${item}`);
  }
}

test("listAdminTherapists entrega view-model semantico con summary y schedulesByDay agrupado", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM therapists t",
      rows: [
        {
          id: 11,
          slug: "ana-luna",
          fullName: "Ana Luna",
          displayName: "Ana",
          phone: "59170001111",
          telegramChatId: "123456",
          isActive: 1,
          createdAt: "2026-05-11T10:00:00.000Z"
        },
        {
          id: 12,
          slug: "bruno-sol",
          fullName: "Bruno Sol",
          displayName: "Bruno",
          phone: null,
          telegramChatId: null,
          isActive: 0,
          createdAt: "2026-05-10T10:00:00.000Z"
        }
      ]
    },
    {
      includes: "admin_therapists_hydration:services",
      assert({ sql, params }) {
        assert.equal(sql.includes("admin_therapists_hydration:schedules"), true);
        assert.equal(sql.includes("admin_therapists_hydration:rooms"), true);
        assert.deepEqual(params, [1, 11, 12, 1, 11, 12, 1, 11, 12]);
      },
      resultSets: [
        [
          { therapistId: 11, serviceId: 201, serviceName: "Masaje" },
          { therapistId: 11, serviceId: 202, serviceName: "Reiki" },
          { therapistId: 12, serviceId: 203, serviceName: "Aromaterapia" }
        ],
        [
          { therapistId: 11, weekday: 1, startTime: "09:00:00", endTime: "13:00:00", slotMinutes: 60, isActive: 1 },
          { therapistId: 11, weekday: 2, startTime: "09:00:00", endTime: "13:00:00", slotMinutes: 60, isActive: 1 },
          { therapistId: 11, weekday: 3, startTime: "09:00:00", endTime: "13:00:00", slotMinutes: 60, isActive: 1 },
          { therapistId: 11, weekday: 5, startTime: "14:00:00", endTime: "18:00:00", slotMinutes: 30, isActive: 0 },
          { therapistId: 12, weekday: 4, startTime: "08:00:00", endTime: "10:00:00", slotMinutes: 30, isActive: 0 }
        ],
        [
          { therapistId: 11, compatibleRoomsCount: 2 }
        ]
      ]
    }
  ]);

  const payload = await listAdminTherapists({
    connection,
    adminSession: { centerId: 1 },
    status: "all",
    limit: 20,
    now: new Date("2026-05-12T16:00:00.000Z")
  });

  connection.assertDone();

  assert.equal(payload.generatedAt, "2026-05-12T16:00:00.000Z");
  assert.equal(payload.summary.total, 2);
  assert.equal(payload.summary.active, 1);
  assert.equal(payload.summary.inactive, 1);

  const firstTherapist = payload.therapists[0];
  assert.equal(firstTherapist.id, 11);
  assert.equal(firstTherapist.isActive, true);
  assert.equal(firstTherapist.status, "ACTIVE");
  assert.equal(firstTherapist.statusLabel, "Activo");
  assert.deepEqual(firstTherapist.avatar, {
    kind: "initials",
    initials: "AL",
    imageUrl: null,
    status: "NOT_CONFIGURED",
    statusLabel: "Sin foto",
    storageProvider: null
  });
  assert.equal(firstTherapist.contactSummary, "59170001111");
  assert.equal(firstTherapist.servicesCount, 2);
  assert.equal(firstTherapist.compatibleRoomsCount, 2);
  assert.equal(firstTherapist.acceptsNew, true);
  assert.equal(Array.isArray(firstTherapist.services), true);
  assert.deepEqual(firstTherapist.services[0], { id: 201, name: "Masaje" });
  assert.equal(typeof firstTherapist.services[0].id, "number");

  assert.equal(firstTherapist.schedulesByDay.length, 2);
  assert.deepEqual(firstTherapist.schedulesByDay[0], {
    timeRange: "09:00-13:00",
    days: ["Lun", "Mar", "Mie"],
    daysLabel: "Lun, Mar, Mie",
    slotMinutes: 60,
    status: "ACTIVE",
    statusLabel: "Activo"
  });
  assert.equal(firstTherapist.schedulesByDay[1].statusLabel, "Inactivo");

  const secondTherapist = payload.therapists[1];
  assert.equal(secondTherapist.status, "INACTIVE");
  assert.equal(secondTherapist.statusLabel, "Inactivo");
  assert.equal(secondTherapist.compatibleRoomsCount, 0);
  assert.equal(secondTherapist.acceptsNew, true);

  assertNoForbiddenStatusLiterals(payload);
});

test("getAdminTherapistDetail agrega status semantico en terapeuta, servicios y horarios", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM therapists",
      rows: [
        {
          id: 12,
          slug: "bruno-sol",
          fullName: "Bruno Sol",
          displayName: "Bruno",
          phone: null,
          telegramChatId: null,
          isActive: 0,
          createdAt: "2026-05-10T10:00:00.000Z"
        }
      ]
    },
    {
      includes: "FROM therapist_services ts",
      rows: [
        {
          id: 300,
          slug: "reiki",
          name: "Reiki",
          durationMinutes: 45,
          isActive: 1,
          priority: 1,
          relationIsActive: 1
        },
        {
          id: 301,
          slug: "aroma",
          name: "Aromaterapia",
          durationMinutes: 60,
          isActive: 1,
          priority: 2,
          relationIsActive: 0
        }
      ]
    },
    {
      includes: "FROM resource_schedules",
      rows: [
        {
          id: 901,
          weekday: 1,
          startTime: "08:00:00",
          endTime: "11:00:00",
          slotMinutes: 60,
          validFrom: null,
          validTo: null,
          isActive: 1
        },
        {
          id: 902,
          weekday: 2,
          startTime: "12:00:00",
          endTime: "14:00:00",
          slotMinutes: 30,
          validFrom: "2026-05-01",
          validTo: "2026-05-31",
          isActive: 0
        }
      ]
    },
    {
      includes: "COUNT(DISTINCT r.id) AS compatibleRoomsCount",
      rows: [{ compatibleRoomsCount: 2 }]
    },
    {
      includes: "LEFT JOIN therapist_services",
      rows: [
        {
          id: 300,
          slug: "reiki",
          name: "Reiki",
          durationMinutes: 45,
          isActive: 1,
          priority: 1,
          relationIsActive: 1
        },
        {
          id: 302,
          slug: "osteopatia",
          name: "Osteopatia",
          durationMinutes: 60,
          isActive: 1,
          priority: 100,
          relationIsActive: 0
        }
      ]
    }
  ]);

  const payload = await getAdminTherapistDetail({
    connection,
    adminSession: { centerId: 1 },
    therapistId: 12,
    now: new Date("2026-05-12T17:00:00.000Z")
  });

  connection.assertDone();

  assert.equal(payload.therapist.id, 12);
  assert.equal(payload.therapist.status, "INACTIVE");
  assert.equal(payload.therapist.statusLabel, "Inactivo");
  assert.deepEqual(payload.therapist.avatar, {
    kind: "initials",
    initials: "BS",
    imageUrl: null,
    status: "NOT_CONFIGURED",
    statusLabel: "Sin foto",
    storageProvider: null
  });
  assert.equal(payload.therapist.compatibleRoomsCount, 2);
  assert.equal(payload.therapist.acceptsNew, true);

  assert.equal(payload.services.length, 2);
  assert.equal(payload.services[0].id, 300);
  assert.equal(payload.services[0].relationStatus, "ACTIVE");
  assert.equal(payload.services[0].statusLabel, "Activo");
  assert.equal(payload.services[1].relationStatus, "INACTIVE");
  assert.equal(payload.services[1].statusLabel, "Inactivo");
  assert.equal(payload.availableServices.length, 2);
  assert.equal(payload.availableServices[0].relationIsActive, true);
  assert.equal(payload.availableServices[1].relationStatus, "INACTIVE");

  assert.equal(payload.schedules.length, 2);
  assert.equal(payload.schedules[0].status, "ACTIVE");
  assert.equal(payload.schedules[0].statusLabel, "Activo");
  assert.equal(payload.schedules[1].status, "INACTIVE");
  assert.equal(payload.schedules[1].statusLabel, "Inactivo");

  assertNoForbiddenStatusLiterals(payload);
});

test("updateAdminTherapistAvailability reemplaza horarios con rangos de 30 minutos", async () => {
  const steps = [];
  const connection = {
    async beginTransaction() {
      steps.push("begin");
    },
    async commit() {
      steps.push("commit");
    },
    async rollback() {
      steps.push("rollback");
    },
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push({ sql: normalizedSql, params });

      if (normalizedSql.includes("FROM centers")) {
        return [[{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("FOR UPDATE")) {
        assert.deepEqual(params, [1, 12]);
        return [[{ id: 12 }]];
      }

      if (normalizedSql.startsWith("DELETE FROM resource_schedules")) {
        assert.deepEqual(params, [1, 12]);
        return [{ affectedRows: 3 }];
      }

      if (normalizedSql.startsWith("INSERT INTO resource_schedules")) {
        assert.deepEqual(params, [
          1, 12, 1, "09:00:00", "17:00:00",
          1, 12, 1, "17:00:00", "18:00:00",
          1, 12, 2, "09:30:00", "13:00:00"
        ]);
        return [{ affectedRows: 3 }];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("WHERE center_id = ? AND id = ? LIMIT 1")) {
        return [[{
          id: 12,
          slug: "ana",
          fullName: "Ana Luna",
          displayName: "Ana",
          phone: null,
          telegramChatId: null,
          isActive: 1,
          createdAt: "2026-05-10T10:00:00.000Z"
        }]];
      }

      if (normalizedSql.includes("FROM therapist_services ts")) {
        return [[]];
      }

      if (normalizedSql.includes("FROM resource_schedules")) {
        return [[
          { id: 901, weekday: 1, startTime: "09:00:00", endTime: "17:00:00", slotMinutes: 30, validFrom: null, validTo: null, isActive: 1 },
          { id: 902, weekday: 1, startTime: "17:00:00", endTime: "18:00:00", slotMinutes: 30, validFrom: null, validTo: null, isActive: 1 },
          { id: 903, weekday: 2, startTime: "09:30:00", endTime: "13:00:00", slotMinutes: 30, validFrom: null, validTo: null, isActive: 1 }
        ]];
      }

      if (normalizedSql.includes("COUNT(DISTINCT r.id) AS compatibleRoomsCount")) {
        return [[{ compatibleRoomsCount: 0 }]];
      }

      if (normalizedSql.includes("FROM services s") && normalizedSql.includes("LEFT JOIN therapist_services")) {
        return [[]];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const payload = await updateAdminTherapistAvailability({
    connection,
    adminSession: { centerId: 1 },
    therapistId: 12,
    days: [
      {
        weekday: 1,
        isActive: true,
        ranges: [
          { startTime: "09:00", endTime: "17:00" },
          { startTime: "17:00", endTime: "18:00" }
        ]
      },
      {
        weekday: 2,
        isActive: true,
        ranges: [{ startTime: "09:30", endTime: "13:00" }]
      },
      {
        weekday: 6,
        isActive: false,
        ranges: []
      }
    ],
    now: new Date("2026-05-12T17:00:00.000Z")
  });

  assert.equal(payload.therapist.id, 12);
  assert.equal(payload.schedules.length, 3);
  assert.equal(payload.schedules[0].slotMinutes, 30);
  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("commit"), true);
  assert.equal(steps.includes("rollback"), false);
});

test("updateAdminTherapistAvailability rechaza rangos solapados o fuera de media hora", async () => {
  const connection = {
    async query(sql) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      if (normalizedSql.includes("FROM centers")) {
        return [[{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }
      throw new Error(`Query no esperada: ${normalizedSql}`);
    },
    async beginTransaction() {
      throw new Error("no debe abrir transaccion");
    }
  };

  await assert.rejects(
    () => updateAdminTherapistAvailability({
      connection,
      adminSession: { centerId: 1 },
      therapistId: 12,
      days: [{ weekday: 1, isActive: true, ranges: [{ startTime: "09:45", endTime: "11:00" }] }]
    }),
    (error) => error.message === "Hora debe estar en intervalos de 30 minutos"
  );

  await assert.rejects(
    () => updateAdminTherapistAvailability({
      connection,
      adminSession: { centerId: 1 },
      therapistId: 12,
      days: [
        {
          weekday: 1,
          isActive: true,
          ranges: [
            { startTime: "09:00", endTime: "12:00" },
            { startTime: "11:30", endTime: "13:00" }
          ]
        }
      ]
    }),
    (error) => error.message === "Rangos solapados en el mismo dia"
  );
});

test("updateAdminTherapistProfile actualiza datos editables del perfil", async () => {
  const steps = [];
  const connection = {
    async beginTransaction() {
      steps.push("begin");
    },
    async commit() {
      steps.push("commit");
    },
    async rollback() {
      steps.push("rollback");
    },
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push({ sql: normalizedSql, params });

      if (normalizedSql.includes("FROM centers")) {
        return [[{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("FOR UPDATE")) {
        assert.deepEqual(params, [1, 12]);
        return [[{ id: 12 }]];
      }

      if (normalizedSql.startsWith("UPDATE therapists SET")) {
        assert.deepEqual(params, [
          "Ana Luna",
          "Ana",
          "59171234567",
          "ana-luna",
          1,
          1,
          12
        ]);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("WHERE center_id = ? AND id = ? LIMIT 1")) {
        return [[{
          id: 12,
          slug: "ana",
          fullName: "Ana Luna",
          displayName: "Ana",
          phone: "59171234567",
          telegramChatId: "ana-luna",
          isActive: 1,
          createdAt: "2026-05-10T10:00:00.000Z"
        }]];
      }

      if (normalizedSql.includes("FROM therapist_services ts")) {
        return [[]];
      }

      if (normalizedSql.includes("FROM resource_schedules")) {
        return [[]];
      }

      if (normalizedSql.includes("COUNT(DISTINCT r.id) AS compatibleRoomsCount")) {
        return [[{ compatibleRoomsCount: 0 }]];
      }

      if (normalizedSql.includes("FROM services s") && normalizedSql.includes("LEFT JOIN therapist_services")) {
        return [[]];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const payload = await updateAdminTherapistProfile({
    connection,
    adminSession: { centerId: 1 },
    therapistId: 12,
    fullName: "Ana Luna",
    displayName: "Ana",
    phone: "59171234567",
    telegramChatId: "ana-luna",
    isActive: true,
    now: new Date("2026-05-12T17:00:00.000Z")
  });

  assert.equal(payload.therapist.displayName, "Ana");
  assert.equal(payload.therapist.phone, "59171234567");
  assert.equal(payload.therapist.telegramChatId, "ana-luna");
  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("commit"), true);
  assert.equal(steps.includes("rollback"), false);
});

test("updateAdminTherapistService activa una relacion terapeuta-servicio", async () => {
  const steps = [];
  const connection = {
    async beginTransaction() {
      steps.push("begin");
    },
    async commit() {
      steps.push("commit");
    },
    async rollback() {
      steps.push("rollback");
    },
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push({ sql: normalizedSql, params });

      if (normalizedSql.includes("FROM centers")) {
        return [[{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("FOR UPDATE")) {
        assert.deepEqual(params, [1, 12]);
        return [[{ id: 12 }]];
      }

      if (normalizedSql.includes("FROM services") && normalizedSql.includes("FOR UPDATE")) {
        assert.deepEqual(params, [1, 300]);
        return [[{ id: 300 }]];
      }

      if (normalizedSql.startsWith("INSERT INTO therapist_services")) {
        assert.deepEqual(params, [1, 12, 300, 1]);
        assert.equal(normalizedSql.includes("ON DUPLICATE KEY UPDATE"), true);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.includes("FROM therapists") && normalizedSql.includes("WHERE center_id = ? AND id = ? LIMIT 1")) {
        return [[{
          id: 12,
          slug: "ana",
          fullName: "Ana Luna",
          displayName: "Ana",
          phone: null,
          telegramChatId: null,
          isActive: 1,
          createdAt: "2026-05-10T10:00:00.000Z"
        }]];
      }

      if (normalizedSql.includes("FROM therapist_services ts")) {
        return [[{
          id: 300,
          slug: "masaje",
          name: "Masaje",
          durationMinutes: 60,
          isActive: 1,
          priority: 100,
          relationIsActive: 1
        }]];
      }

      if (normalizedSql.includes("FROM resource_schedules")) {
        return [[]];
      }

      if (normalizedSql.includes("COUNT(DISTINCT r.id) AS compatibleRoomsCount")) {
        return [[{ compatibleRoomsCount: 0 }]];
      }

      if (normalizedSql.includes("FROM services s") && normalizedSql.includes("LEFT JOIN therapist_services")) {
        return [[{
          id: 300,
          slug: "masaje",
          name: "Masaje",
          durationMinutes: 60,
          isActive: 1,
          priority: 100,
          relationIsActive: 1
        }]];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const payload = await updateAdminTherapistService({
    connection,
    adminSession: { centerId: 1 },
    therapistId: 12,
    serviceId: 300,
    isActive: true,
    now: new Date("2026-05-12T17:00:00.000Z")
  });

  assert.equal(payload.therapist.id, 12);
  assert.equal(payload.services[0].relationIsActive, true);
  assert.equal(payload.availableServices[0].relationIsActive, true);
  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("commit"), true);
  assert.equal(steps.includes("rollback"), false);
});

test("listAdminTherapists cuenta salas compatibles sin duplicados y excluye salas inactivas", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM therapists t",
      rows: [
        {
          id: 55,
          slug: "laura-rio",
          fullName: "Laura Rio",
          displayName: "Laura Rio",
          phone: "59170003333",
          telegramChatId: null,
          isActive: 1,
          createdAt: "2026-05-09T09:00:00.000Z"
        }
      ]
    },
    {
      includes: "admin_therapists_hydration:services",
      assert({ sql }) {
        assert.equal(sql.includes("ts.is_active = 1"), true);
        assert.equal(sql.includes("s.is_active = 1"), true);
        assert.equal(sql.includes("sr.is_active = 1"), true);
        assert.equal(sql.includes("r.is_active = 1"), true);
      },
      resultSets: [
        [
          { therapistId: 55, serviceId: 401, serviceName: "Servicio A" },
          { therapistId: 55, serviceId: 402, serviceName: "Servicio B" }
        ],
        [],
        [{ therapistId: 55, compatibleRoomsCount: 2 }]
      ]
    }
  ]);

  const payload = await listAdminTherapists({
    connection,
    adminSession: { centerId: 1 },
    status: "all",
    limit: 20
  });

  connection.assertDone();

  assert.equal(payload.therapists.length, 1);
  assert.equal(payload.therapists[0].compatibleRoomsCount, 2);
  assert.equal(payload.therapists[0].acceptsNew, true);
  assertNoForbiddenStatusLiterals(payload);
});
