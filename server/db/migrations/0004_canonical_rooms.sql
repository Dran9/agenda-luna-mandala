INSERT INTO rooms (center_id, slug, name, capacity, is_active)
SELECT id, 'sala-fenix', 'Sala Fénix', 1, 1
FROM centers
WHERE slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  capacity = VALUES(capacity),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO rooms (center_id, slug, name, capacity, is_active)
SELECT id, 'sala-cristales', 'Sala Cristales', 1, 1
FROM centers
WHERE slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  capacity = VALUES(capacity),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO rooms (center_id, slug, name, capacity, is_active)
SELECT id, 'sala-orion', 'Sala Orión', 1, 1
FROM centers
WHERE slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  capacity = VALUES(capacity),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO rooms (center_id, slug, name, capacity, is_active)
SELECT id, 'sala-lakshmi', 'Sala Lakshmi', 1, 1
FROM centers
WHERE slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  capacity = VALUES(capacity),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

UPDATE rooms r
INNER JOIN centers c ON c.id = r.center_id
SET r.is_active = 0,
    r.updated_at = CURRENT_TIMESTAMP
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-luna', 'sala-sol', 'sala-aurora')
  AND r.is_active = 1;

DELETE rf
FROM room_features rf
INNER JOIN centers c ON c.id = rf.center_id
INNER JOIN rooms r ON r.id = rf.room_id AND r.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-fenix', 'sala-cristales', 'sala-orion', 'sala-lakshmi');

INSERT IGNORE INTO room_features (center_id, room_id, feature_key)
SELECT c.id, r.id, 'camilla'
FROM centers c
INNER JOIN rooms r ON r.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-fenix', 'sala-cristales');

INSERT IGNORE INTO room_features (center_id, room_id, feature_key)
SELECT c.id, r.id, 'mesa'
FROM centers c
INNER JOIN rooms r ON r.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-fenix', 'sala-orion', 'sala-lakshmi');

INSERT INTO service_rooms (center_id, service_id, room_id, is_active)
SELECT c.id, s.id, r.id, 1
FROM centers c
INNER JOIN services s ON s.center_id = c.id AND s.is_active = 1
INNER JOIN rooms r ON r.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-fenix', 'sala-cristales', 'sala-orion', 'sala-lakshmi')
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active);

INSERT INTO resource_schedules (
  center_id,
  resource_type,
  resource_id,
  weekday,
  start_time,
  end_time,
  slot_minutes,
  is_active
)
SELECT c.id, 'room', r.id, weekdays.weekday, '08:00:00', '18:00:00', 60, 1
FROM centers c
INNER JOIN rooms r ON r.center_id = c.id
INNER JOIN (
  SELECT 1 AS weekday
  UNION ALL SELECT 2
  UNION ALL SELECT 3
  UNION ALL SELECT 4
  UNION ALL SELECT 5
  UNION ALL SELECT 6
) weekdays
WHERE c.slug = 'luna-mandala'
  AND r.slug IN ('sala-fenix', 'sala-cristales', 'sala-orion', 'sala-lakshmi')
ON DUPLICATE KEY UPDATE
  slot_minutes = VALUES(slot_minutes),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
