const { createPool } = require("./pool");
const { runDbPreflight } = require("./verify");

const CENTER = {
  slug: "luna-mandala",
  name: "Luna Mandala",
  timezone: "America/La_Paz",
  currency: "BOB"
};

const SERVICES = [
  {
    slug: "terapia-almica-individual-o-de-pareja",
    name: "Terapia Álmica individual o de pareja",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "carta-astral",
    name: "Carta Astral",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "desbloqueo-y-limpieza-de-aura",
    name: "Desbloqueo y limpieza de Aura",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "alineacion-de-chakras",
    name: "Alineación de Chakras",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "corte-de-lazos-karmicos",
    name: "Corte de Lazos Kármicos",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "tarot-evolutivo",
    name: "Tarot Evolutivo",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "registros-akhasicos",
    name: "Registros Akáshicos",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "sanacion-reiki",
    name: "Sanación Reiki",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "terapia-de-pareja",
    name: "Terapia de Pareja",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "constelaciones-familiares",
    name: "Constelaciones Familiares",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "osteopatia",
    name: "Osteopatía",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "bioenergetica",
    name: "Bioenergética",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  },
  {
    slug: "masaje-craneosacral",
    name: "Masaje Craneosacral",
    description: null,
    durationMinutes: 60,
    priceAmount: 0
  }
];
const SERVICE_ROOM_REQUIREMENTS = {
  "carta-astral": ["mesa"],
  "desbloqueo-y-limpieza-de-aura": ["camilla"],
  "alineacion-de-chakras": ["camilla"],
  "corte-de-lazos-karmicos": ["camilla"],
  "tarot-evolutivo": ["mesa"],
  "sanacion-reiki": ["camilla"],
  osteopatia: ["camilla"],
  bioenergetica: ["camilla"],
  "masaje-craneosacral": ["camilla"]
};

const ROOMS = [
  { slug: "sala-fenix", name: "Sala Fénix", capacity: 1, features: ["camilla", "mesa"] },
  { slug: "sala-cristales", name: "Sala Cristales", capacity: 1, features: ["camilla"] },
  { slug: "sala-orion", name: "Sala Orión", capacity: 1, features: ["mesa"] },
  { slug: "sala-lakshmi", name: "Sala Lakshmi", capacity: 1, features: ["mesa"] }
];

const OBSOLETE_ROOM_SLUGS = ["sala-luna", "sala-sol", "sala-aurora"];
const OBSOLETE_SERVICE_SLUGS = ["masaje-relajante", "reiki-integral", "aromaterapia"];
const OBSOLETE_THERAPIST_SLUGS = [
  "ana-quispe",
  "beatriz-vargas",
  "carla-rojas",
  "diego-lopez",
  "elena-mamani"
];
const ROOM_FEATURE_KEYS = new Set(["camilla", "mesa"]);

const THERAPISTS = [
  { slug: "cecy-mendoza", fullName: "Cecy Mendoza", displayName: "Cecy Mendoza" },
  { slug: "orion-inti", fullName: "Orion Inti", displayName: "Orion Inti" },
  { slug: "horacio-marengo", fullName: "Horacio Marengo", displayName: "Horacio Marengo" },
  { slug: "carla-bustamante", fullName: "Carla Bustamante", displayName: "Carla Bustamante" },
  { slug: "daniel-maclean", fullName: "Daniel MacLean", displayName: "Daniel MacLean" }
];

const THERAPIST_SERVICE_MATRIX = {
  "cecy-mendoza": [
    "terapia-almica-individual-o-de-pareja",
    "tarot-evolutivo",
    "registros-akhasicos",
    "terapia-de-pareja"
  ],
  "orion-inti": [
    "terapia-almica-individual-o-de-pareja",
    "carta-astral",
    "desbloqueo-y-limpieza-de-aura",
    "alineacion-de-chakras",
    "corte-de-lazos-karmicos",
    "tarot-evolutivo",
    "sanacion-reiki"
  ],
  "horacio-marengo": [
    "sanacion-reiki",
    "osteopatia",
    "bioenergetica",
    "masaje-craneosacral"
  ],
  "carla-bustamante": ["constelaciones-familiares"],
  "daniel-maclean": ["constelaciones-familiares"]
};

const WORKING_WEEKDAYS = [1, 2, 3, 4, 5, 6];
const WORKING_START_TIME = "08:00:00";
const WORKING_END_TIME = "18:00:00";
const DEFAULT_SLOT_MINUTES = 60;

async function upsertCenter(connection) {
  await connection.query(
    `INSERT INTO centers (slug, name, timezone, currency_code, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       timezone = VALUES(timezone),
       currency_code = VALUES(currency_code),
       is_active = 1,
       updated_at = CURRENT_TIMESTAMP`,
    [CENTER.slug, CENTER.name, CENTER.timezone, CENTER.currency]
  );

  const [rows] = await connection.query("SELECT id FROM centers WHERE slug = ? LIMIT 1", [CENTER.slug]);
  return rows[0].id;
}

async function upsertCenterSettings(connection, centerId) {
  await connection.query(
    `INSERT INTO center_settings (
      center_id,
      booking_policy_json,
      messaging_provider,
      cancellation_window_hours,
      cancellation_fee_percent
    ) VALUES (?, ?, 'test_outbox', 6, 50)
    ON DUPLICATE KEY UPDATE
      booking_policy_json = VALUES(booking_policy_json),
      messaging_provider = VALUES(messaging_provider),
      cancellation_window_hours = VALUES(cancellation_window_hours),
      cancellation_fee_percent = VALUES(cancellation_fee_percent),
      updated_at = CURRENT_TIMESTAMP`,
    [
      centerId,
      JSON.stringify({
        minimumLeadMinutes: 30,
        slotStepMinutes: 30,
        maxAdvanceDays: 60
      })
    ]
  );
}

async function upsertAdminDev(connection, centerId) {
  await connection.query(
    `INSERT INTO admin_users (
      center_id,
      email,
      full_name,
      password_hash,
      role,
      is_active
    ) VALUES (?, 'admin.dev@lunamandala.local', 'Admin Dev Luna', 'dev-only-placeholder-hash', 'owner', 1)
    ON DUPLICATE KEY UPDATE
      center_id = VALUES(center_id),
      full_name = VALUES(full_name),
      password_hash = VALUES(password_hash),
      role = VALUES(role),
      is_active = VALUES(is_active),
      updated_at = CURRENT_TIMESTAMP`,
    [centerId]
  );
}

async function upsertServices(connection, centerId) {
  for (const service of SERVICES) {
    await connection.query(
      `INSERT INTO services (
        center_id,
        slug,
        name,
        description,
        duration_minutes,
        price_amount,
        currency_code,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        duration_minutes = VALUES(duration_minutes),
        price_amount = VALUES(price_amount),
        currency_code = VALUES(currency_code),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP`,
      [
        centerId,
        service.slug,
        service.name,
        service.description,
        service.durationMinutes,
        service.priceAmount,
        CENTER.currency
      ]
    );
  }

  const serviceSlugs = SERVICES.map((service) => service.slug);
  const [rows] = await connection.query(
    `SELECT id, slug FROM services WHERE center_id = ? AND slug IN (${serviceSlugs.map(() => "?").join(", ")})`,
    [centerId, ...serviceSlugs]
  );
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function deactivateObsoleteServices(connection, centerId) {
  for (const slug of OBSOLETE_SERVICE_SLUGS) {
    await connection.query(
      `UPDATE services
       SET is_active = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE center_id = ?
         AND slug = ?
         AND is_active = 1`,
      [centerId, slug]
    );
  }
}

async function upsertServiceRoomRequirements(connection, centerId, serviceBySlug) {
  for (const [serviceSlug, featureKeys] of Object.entries(SERVICE_ROOM_REQUIREMENTS)) {
    const serviceId = serviceBySlug.get(serviceSlug);
    if (!serviceId) continue;

    for (const featureKey of featureKeys) {
      await connection.query(
        `INSERT INTO service_room_requirements (center_id, service_id, feature_key, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           is_active = VALUES(is_active),
           updated_at = CURRENT_TIMESTAMP`,
        [centerId, serviceId, featureKey]
      );
    }
  }
}

async function upsertRooms(connection, centerId) {
  for (const room of ROOMS) {
    await connection.query(
      `INSERT INTO rooms (center_id, slug, name, capacity, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        capacity = VALUES(capacity),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP`,
      [centerId, room.slug, room.name, room.capacity]
    );
  }

  const roomSlugs = ROOMS.map((room) => room.slug);
  const [rows] = await connection.query(
    `SELECT id, slug FROM rooms WHERE center_id = ? AND slug IN (${roomSlugs.map(() => "?").join(", ")})`,
    [centerId, ...roomSlugs]
  );
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function deactivateObsoleteRooms(connection, centerId) {
  for (const slug of OBSOLETE_ROOM_SLUGS) {
    await connection.query(
      `UPDATE rooms
       SET is_active = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE center_id = ?
         AND slug = ?
         AND is_active = 1`,
      [centerId, slug]
    );
  }
}

async function upsertRoomFeatures(connection, centerId, roomBySlug) {
  for (const room of ROOMS) {
    const roomId = roomBySlug.get(room.slug);
    if (!roomId) {
      continue;
    }

    await connection.query(
      "DELETE FROM room_features WHERE center_id = ? AND room_id = ?",
      [centerId, roomId]
    );

    for (const featureKey of room.features) {
      if (!ROOM_FEATURE_KEYS.has(featureKey)) {
        continue;
      }

      await connection.query(
        "INSERT IGNORE INTO room_features (center_id, room_id, feature_key) VALUES (?, ?, ?)",
        [centerId, roomId, featureKey]
      );
    }
  }
}

async function upsertTherapists(connection, centerId) {
  for (const therapist of THERAPISTS) {
    await connection.query(
      `INSERT INTO therapists (center_id, slug, full_name, display_name, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        display_name = VALUES(display_name),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP`,
      [centerId, therapist.slug, therapist.fullName, therapist.displayName]
    );
  }

  const therapistSlugs = THERAPISTS.map((therapist) => therapist.slug);
  const [rows] = await connection.query(
    `SELECT id, slug FROM therapists WHERE center_id = ? AND slug IN (${therapistSlugs.map(() => "?").join(", ")})`,
    [centerId, ...therapistSlugs]
  );
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function deactivateObsoleteTherapists(connection, centerId) {
  for (const slug of OBSOLETE_THERAPIST_SLUGS) {
    await connection.query(
      `UPDATE therapists
       SET is_active = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE center_id = ?
         AND slug = ?
         AND is_active = 1`,
      [centerId, slug]
    );
  }
}

async function upsertTherapistServices(connection, centerId, serviceBySlug, therapistBySlug) {
  for (const [therapistSlug, serviceSlugs] of Object.entries(THERAPIST_SERVICE_MATRIX)) {
    const therapistId = therapistBySlug.get(therapistSlug);
    if (!therapistId) {
      continue;
    }

    for (const serviceSlug of serviceSlugs) {
      const serviceId = serviceBySlug.get(serviceSlug);
      if (!serviceId) {
        continue;
      }

      await connection.query(
        `INSERT INTO therapist_services (
          center_id,
          therapist_id,
          service_id,
          priority,
          is_active
        ) VALUES (?, ?, ?, 100, 1)
        ON DUPLICATE KEY UPDATE
          priority = VALUES(priority),
          is_active = VALUES(is_active)`,
        [centerId, therapistId, serviceId]
      );
    }
  }
}

function getCanonicalRoomIds(roomBySlug) {
  return ROOMS
    .map((room) => roomBySlug.get(room.slug))
    .filter((roomId) => roomId !== undefined && roomId !== null);
}

async function upsertServiceRooms(connection, centerId, serviceBySlug, roomBySlug) {
  const roomIds = getCanonicalRoomIds(roomBySlug);

  for (const serviceId of serviceBySlug.values()) {
    for (const roomId of roomIds) {
      await connection.query(
        `INSERT INTO service_rooms (center_id, service_id, room_id, is_active)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          is_active = VALUES(is_active)`,
        [centerId, serviceId, roomId]
      );
    }
  }
}

async function upsertResourceSchedules(connection, centerId, therapistBySlug, roomBySlug) {
  for (const therapistId of therapistBySlug.values()) {
    for (const weekday of WORKING_WEEKDAYS) {
      await connection.query(
        `INSERT INTO resource_schedules (
          center_id,
          resource_type,
          resource_id,
          weekday,
          start_time,
          end_time,
          slot_minutes,
          is_active
        ) VALUES (?, 'therapist', ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          slot_minutes = VALUES(slot_minutes),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          therapistId,
          weekday,
          WORKING_START_TIME,
          WORKING_END_TIME,
          DEFAULT_SLOT_MINUTES
        ]
      );
    }
  }

  for (const roomId of getCanonicalRoomIds(roomBySlug)) {
    for (const weekday of WORKING_WEEKDAYS) {
      await connection.query(
        `INSERT INTO resource_schedules (
          center_id,
          resource_type,
          resource_id,
          weekday,
          start_time,
          end_time,
          slot_minutes,
          is_active
        ) VALUES (?, 'room', ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          slot_minutes = VALUES(slot_minutes),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          roomId,
          weekday,
          WORKING_START_TIME,
          WORKING_END_TIME,
          DEFAULT_SLOT_MINUTES
        ]
      );
    }
  }
}

async function runSeed() {
  const pool = createPool();
  const connection = await pool.getConnection();
  let hasOpenTransaction = false;

  try {
    await runDbPreflight(connection, { mode: "seed", log: true });

    await connection.beginTransaction();
    hasOpenTransaction = true;

    const centerId = await upsertCenter(connection);
    await upsertCenterSettings(connection, centerId);
    await upsertAdminDev(connection, centerId);

    const serviceBySlug = await upsertServices(connection, centerId);
    const roomBySlug = await upsertRooms(connection, centerId);
    const therapistBySlug = await upsertTherapists(connection, centerId);

    await deactivateObsoleteServices(connection, centerId);
    await deactivateObsoleteRooms(connection, centerId);
    await deactivateObsoleteTherapists(connection, centerId);
    await upsertServiceRoomRequirements(connection, centerId, serviceBySlug);
    await upsertRoomFeatures(connection, centerId, roomBySlug);
    await upsertTherapistServices(connection, centerId, serviceBySlug, therapistBySlug);
    await upsertServiceRooms(connection, centerId, serviceBySlug, roomBySlug);
    await upsertResourceSchedules(connection, centerId, therapistBySlug, roomBySlug);

    await connection.commit();
    hasOpenTransaction = false;

    console.log("[db:seed] Seed minimo aplicado.");
    console.log(`[db:seed] Centro: ${CENTER.name}`);
    console.log(`[db:seed] Servicios: ${SERVICES.length}`);
    console.log(`[db:seed] Salas: ${ROOMS.length}`);
    console.log(`[db:seed] Terapeutas: ${THERAPISTS.length}`);
  } catch (error) {
    if (hasOpenTransaction) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error(`[db:seed] Fallo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  ROOM_FEATURE_KEYS,
  ROOMS,
  getCanonicalRoomIds,
  runSeed,
  upsertRoomFeatures,
  upsertRooms,
  upsertResourceSchedules,
  upsertServiceRooms
};
