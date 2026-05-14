const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
  _resetServiceRoomRequirementsSchemaCache,
  createRoom,
  listAdminResources,
  updateRoom
} = require("../server/services/adminResources.service");

beforeEach(() => {
  _resetServiceRoomRequirementsSchemaCache();
});

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
          `Falta "${step.includes}" en query #${callIndex + 1}`
        );
      }

      if (step.assert) {
        step.assert({ sql: normalizedSql, params });
      }

      callIndex += 1;
      return [step.rows || []];
    },
    assertDone() {
      assert.equal(callIndex, scriptedSteps.length, "No se consumieron todos los pasos");
    }
  };
}

test("listAdminResources devuelve settings semantico con labels y summary", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM services",
      rows: [
        {
          id: 10,
          name: "Masaje",
          durationMinutes: 60,
          priceAmount: "180.00",
          currencyCode: "BOB",
          isActive: 1
        },
        {
          id: 11,
          name: "Reiki",
          durationMinutes: 45,
          priceAmount: "0.00",
          currencyCode: "BOB",
          isActive: 0
        }
      ]
    },
    {
      includes: "FROM rooms",
      rows: [
        { id: 20, name: "Sala Luna", capacity: 2, isActive: 1 },
        { id: 21, name: "Sala Sol", capacity: 1, isActive: 0 }
      ]
    },
    {
      includes: "FROM service_rooms sr",
      rows: [
        { serviceId: 10, serviceName: "Masaje", roomId: 20, roomName: "Sala Luna", isActive: 1 },
        { serviceId: 10, serviceName: "Masaje", roomId: 21, roomName: "Sala Sol", isActive: 0 },
        { serviceId: 11, serviceName: "Reiki", roomId: 21, roomName: "Sala Sol", isActive: 1 }
      ]
    },
    {
      includes: "FROM room_features",
      rows: [
        { roomId: 20, featureKey: "camilla" },
        { roomId: 20, featureKey: "mesa" },
        { roomId: 21, featureKey: "mesa" }
      ]
    },
    {
      includes: "TABLE_NAME = 'service_room_requirements'",
      rows: [{ tableCount: 1 }]
    },
    {
      includes: "FROM service_room_requirements",
      rows: [
        { serviceId: 10, featureKey: "camilla" },
        { serviceId: 10, featureKey: "mesa" }
      ]
    },
    {
      includes: "FROM resource_schedules rs",
      rows: [
        {
          id: 30,
          resourceType: "therapist",
          resourceId: 501,
          weekday: 1,
          startTime: "08:00:00",
          endTime: "12:00:00",
          slotMinutes: 60,
          validFrom: null,
          validTo: null,
          isActive: 1,
          resourceName: "Ana"
        },
        {
          id: 31,
          resourceType: "room",
          resourceId: 20,
          weekday: 2,
          startTime: "09:30:00",
          endTime: "15:30:00",
          slotMinutes: 30,
          validFrom: "2026-05-01",
          validTo: "2026-05-31",
          isActive: 0,
          resourceName: "Sala Luna"
        }
      ]
    }
  ]);

  const payload = await listAdminResources({
    connection,
    adminSession: { centerId: 1 },
    now: new Date("2026-05-12T16:00:00.000Z")
  });

  connection.assertDone();

  assert.equal(payload.center.slug, "luna");
  assert.equal(payload.generatedAt, "2026-05-12T16:00:00.000Z");
  assert.equal(payload.summary.servicesTotal, 2);
  assert.equal(payload.summary.roomsTotal, 2);
  assert.equal(payload.summary.compatibilitiesTotal, 3);
  assert.equal(payload.summary.schedulesTotal, 2);

  assert.equal(payload.settings.services[0].name, "Masaje");
  assert.equal(payload.settings.services[0].durationLabel, "60 min");
  assert.equal(payload.settings.services[0].priceLabel, "180 BOB");
  assert.equal(payload.settings.services[0].status, "ACTIVE");
  assert.equal(payload.settings.services[0].compatibleRoomsCount, 1);
  assert.deepEqual(payload.settings.services[0].requiredFeatureKeys, ["camilla", "mesa"]);
  assert.equal(payload.settings.services[0].requiredFeaturesLabel, "Camilla, Mesa");

  assert.equal(payload.settings.rooms[0].name, "Sala Luna");
  assert.equal(payload.settings.rooms[0].capacityLabel, "2 personas");
  assert.equal(payload.settings.rooms[0].statusLabel, "Activo");
  assert.equal(payload.settings.rooms[0].compatibleServicesCount, 1);
  assert.deepEqual(payload.settings.rooms[0].featureKeys, ["camilla", "mesa"]);
  assert.equal(payload.settings.rooms[0].featuresLabel, "Camilla, Mesa");

  assert.equal(payload.settings.compatibilities[0].id, "10-20");
  assert.equal(payload.settings.compatibilities[0].serviceLabel, "Masaje");
  assert.equal(payload.settings.compatibilities[0].roomLabel, "Sala Luna");
  assert.equal(payload.settings.compatibilities[0].statusLabel, "Activo");

  assert.equal(payload.settings.schedules[0].resourceType, "therapist");
  assert.equal(payload.settings.schedules[0].resourceTypeLabel, "Terapeuta");
  assert.equal(payload.settings.schedules[0].dayLabel, "Lun");
  assert.equal(payload.settings.schedules[0].timeRangeLabel, "08:00 - 12:00");
  assert.equal(payload.settings.schedules[0].slotLabel, "60 min");
  assert.equal(payload.settings.schedules[0].validityLabel, "Sin vigencia");
  assert.equal(payload.settings.schedules[0].status, "ACTIVE");

  assert.equal(payload.settings.schedules[1].resourceTypeLabel, "Sala");
  assert.equal(payload.settings.schedules[1].validityLabel, "2026-05-01 a 2026-05-31");
  assert.equal(payload.settings.schedules[1].statusLabel, "Inactivo");
});

test("listAdminResources aplica filtro resourceType para horarios", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 2, slug: "demo", name: "Luna Demo", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM services",
      rows: []
    },
    {
      includes: "FROM rooms",
      rows: []
    },
    {
      includes: "FROM service_rooms sr",
      rows: []
    },
    {
      includes: "FROM room_features",
      rows: []
    },
    {
      includes: "TABLE_NAME = 'service_room_requirements'",
      rows: [{ tableCount: 0 }]
    },
    {
      includes: "WHERE rs.center_id = ? AND rs.resource_type = ?",
      assert: ({ params }) => {
        assert.deepEqual(params, [2, "room"]);
      },
      rows: []
    }
  ]);

  const payload = await listAdminResources({
    connection,
    adminSession: { centerId: 2 },
    resourceType: "room"
  });

  connection.assertDone();
  assert.equal(payload.settings.schedules.length, 0);
});

test("createRoom crea sala y features en transaccion", async () => {
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
    async query(sql) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push(normalizedSql);

      if (normalizedSql.includes("SELECT id FROM rooms WHERE center_id = ? AND slug = ?")) {
        return [[]];
      }
      if (normalizedSql.includes("INSERT INTO rooms")) {
        return [{ insertId: 44 }];
      }
      if (normalizedSql.includes("INSERT INTO room_features")) {
        return [{ affectedRows: 2 }];
      }
      if (normalizedSql.includes("FROM rooms WHERE center_id = ? AND id = ?")) {
        return [[{ id: 44, name: "Sala Fénix", slug: "sala-fenix", capacity: 1, isActive: 1 }]];
      }
      if (normalizedSql.includes("FROM room_features")) {
        return [[{ featureKey: "camilla" }, { featureKey: "mesa" }]];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const result = await createRoom({
    connection,
    adminSession: { centerId: 1 },
    name: "Sala Fénix",
    capacity: "",
    featureKeys: ["camilla", "mesa"]
  });

  assert.equal(result.slug, "sala-fenix");
  assert.equal(result.capacity, 1);
  assert.deepEqual(result.featureKeys, ["camilla", "mesa"]);
  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("commit"), true);
  assert.equal(steps.includes("rollback"), false);
});

test("createRoom rechaza capacity invalida y recursos fuera del set", async () => {
  const connection = {
    async beginTransaction() {
      throw new Error("no debe iniciar transaccion");
    },
    async query() {
      throw new Error("no debe consultar");
    }
  };

  await assert.rejects(
    () => createRoom({
      connection,
      adminSession: { centerId: 1 },
      name: "Sala Test",
      capacity: "abc",
      featureKeys: ["camilla"]
    }),
    (error) => error.message === "Capacidad debe ser entero entre 1 y 50"
  );

  await assert.rejects(
    () => createRoom({
      connection,
      adminSession: { centerId: 1 },
      name: "Sala Test",
      capacity: 1,
      featureKeys: ["individual"]
    }),
    (error) => error.message.includes("Recurso no permitido")
  );
});

test("updateRoom reemplaza features dentro de transaccion", async () => {
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
    async query(sql) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push(normalizedSql);

      if (normalizedSql.includes("SELECT id FROM rooms WHERE center_id = ? AND id = ? LIMIT 1 FOR UPDATE")) {
        return [[{ id: 20 }]];
      }
      if (normalizedSql.startsWith("UPDATE rooms SET")) {
        return [{ affectedRows: 1 }];
      }
      if (normalizedSql.includes("DELETE FROM room_features")) {
        return [{ affectedRows: 2 }];
      }
      if (normalizedSql.includes("INSERT INTO room_features")) {
        return [{ affectedRows: 1 }];
      }
      if (normalizedSql.includes("FROM rooms WHERE center_id = ? AND id = ?")) {
        return [[{ id: 20, name: "Sala Editada", slug: "sala-fenix", capacity: 2, isActive: 1 }]];
      }
      if (normalizedSql.includes("FROM room_features")) {
        return [[{ featureKey: "mesa" }]];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const result = await updateRoom({
    connection,
    adminSession: { centerId: 1 },
    roomId: 20,
    name: "Sala Editada",
    capacity: 2,
    featureKeys: ["mesa"]
  });

  assert.equal(result.name, "Sala Editada");
  assert.deepEqual(result.featureKeys, ["mesa"]);
  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("commit"), true);
  assert.equal(steps.includes("rollback"), false);
});

test("updateRoom hace rollback si falla reemplazo de features", async () => {
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
    async query(sql) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      steps.push(normalizedSql);

      if (normalizedSql.includes("SELECT id FROM rooms WHERE center_id = ? AND id = ? LIMIT 1 FOR UPDATE")) {
        return [[{ id: 20 }]];
      }
      if (normalizedSql.includes("DELETE FROM room_features")) {
        return [{ affectedRows: 2 }];
      }
      if (normalizedSql.includes("INSERT INTO room_features")) {
        throw new Error("insert failed");
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  await assert.rejects(
    () => updateRoom({
      connection,
      adminSession: { centerId: 1 },
      roomId: 20,
      featureKeys: ["camilla"]
    }),
    (error) => error.code === "ROOM_UPDATE_ERROR"
  );

  assert.equal(steps.includes("begin"), true);
  assert.equal(steps.includes("rollback"), true);
  assert.equal(steps.includes("commit"), false);
});
