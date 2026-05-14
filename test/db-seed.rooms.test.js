const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ROOMS,
  getCanonicalRoomIds,
  upsertRoomFeatures,
  upsertRooms,
  upsertResourceSchedules,
  upsertServiceRooms
} = require("../server/db/seed");

test("seed rooms canonicos conservan nombres visibles con acentos y slugs ascii", () => {
  assert.deepEqual(
    ROOMS.map((room) => ({ slug: room.slug, name: room.name, features: room.features })),
    [
      { slug: "sala-fenix", name: "Sala Fénix", features: ["camilla", "mesa"] },
      { slug: "sala-cristales", name: "Sala Cristales", features: ["camilla"] },
      { slug: "sala-orion", name: "Sala Orión", features: ["mesa"] },
      { slug: "sala-lakshmi", name: "Sala Lakshmi", features: ["mesa"] }
    ]
  );
});

test("upsertRooms devuelve solo salas canonicas", async () => {
  const queries = [];
  const connection = {
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      queries.push({ sql: normalizedSql, params });

      if (normalizedSql.startsWith("INSERT INTO rooms")) {
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.startsWith("SELECT id, slug FROM rooms")) {
        assert.deepEqual(params.slice(1), ROOMS.map((room) => room.slug));
        return [
          [
            { id: 10, slug: "sala-fenix" },
            { id: 11, slug: "sala-cristales" },
            { id: 12, slug: "sala-orion" },
            { id: 13, slug: "sala-lakshmi" }
          ]
        ];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const roomBySlug = await upsertRooms(connection, 1);

  assert.equal(roomBySlug.has("sala-luna"), false);
  assert.equal(roomBySlug.has("sala-custom"), false);
  assert.deepEqual(Array.from(roomBySlug.keys()), ROOMS.map((room) => room.slug));
  assert.equal(queries.filter((query) => query.sql.startsWith("INSERT INTO rooms")).length, 4);
});

test("upsertRoomFeatures solo reemplaza features de salas canonicas", async () => {
  const touchedRoomIds = [];
  const connection = {
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();

      if (normalizedSql.includes("DELETE FROM room_features")) {
        touchedRoomIds.push(params[1]);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.includes("INSERT IGNORE INTO room_features")) {
        touchedRoomIds.push(params[1]);
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  const roomBySlug = new Map([
    ["sala-fenix", 10],
    ["sala-cristales", 11],
    ["sala-orion", 12],
    ["sala-lakshmi", 13],
    ["sala-custom", 99]
  ]);

  await upsertRoomFeatures(connection, 1, roomBySlug);

  assert.equal(touchedRoomIds.includes(99), false);
  assert.deepEqual([...new Set(touchedRoomIds)].sort((a, b) => a - b), [10, 11, 12, 13]);
});

test("service_rooms y resource_schedules usan solo salas canonicas", async () => {
  const roomBySlug = new Map([
    ["sala-fenix", 10],
    ["sala-cristales", 11],
    ["sala-orion", 12],
    ["sala-lakshmi", 13],
    ["sala-custom", 99]
  ]);
  const serviceRoomIds = [];
  const scheduleRoomIds = [];
  const connection = {
    async query(sql, params = []) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();

      if (normalizedSql.startsWith("INSERT INTO service_rooms")) {
        serviceRoomIds.push(params[2]);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.startsWith("INSERT INTO resource_schedules")) {
        if (params[1] >= 10) {
          scheduleRoomIds.push(params[1]);
        }
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Query no esperada: ${normalizedSql}`);
    }
  };

  assert.deepEqual(getCanonicalRoomIds(roomBySlug), [10, 11, 12, 13]);

  await upsertServiceRooms(connection, 1, new Map([["masaje", 501]]), roomBySlug);
  await upsertResourceSchedules(connection, 1, new Map(), roomBySlug);

  assert.equal(serviceRoomIds.includes(99), false);
  assert.equal(scheduleRoomIds.includes(99), false);
  assert.deepEqual([...new Set(serviceRoomIds)].sort((a, b) => a - b), [10, 11, 12, 13]);
  assert.deepEqual([...new Set(scheduleRoomIds)].sort((a, b) => a - b), [10, 11, 12, 13]);
});
