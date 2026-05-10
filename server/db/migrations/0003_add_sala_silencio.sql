-- Adds Sala Silencio (4th room) to the Luna Mandala center, links it to every
-- existing service via service_rooms, and seeds Lun-Sab 08:00-18:00 schedules.
-- Idempotent: re-running is safe.

INSERT INTO rooms (center_id, slug, name, capacity, is_active)
SELECT c.id, 'sala-silencio', 'Sala Silencio', 1, 1
FROM centers c
WHERE c.slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO service_rooms (center_id, service_id, room_id, is_active)
SELECT s.center_id, s.id, r.id, 1
FROM services s
INNER JOIN rooms r
  ON r.center_id = s.center_id
 AND r.slug = 'sala-silencio'
INNER JOIN centers c
  ON c.id = s.center_id
 AND c.slug = 'luna-mandala'
ON DUPLICATE KEY UPDATE
  is_active = 1;

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
SELECT r.center_id, 'room', r.id, w.weekday, '08:00:00', '18:00:00', 60, 1
FROM rooms r
INNER JOIN centers c
  ON c.id = r.center_id
 AND c.slug = 'luna-mandala'
CROSS JOIN (
  SELECT 1 AS weekday UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5 UNION ALL
  SELECT 6
) w
WHERE r.slug = 'sala-silencio'
  AND NOT EXISTS (
    SELECT 1 FROM resource_schedules rs
    WHERE rs.center_id = r.center_id
      AND rs.resource_type = 'room'
      AND rs.resource_id = r.id
      AND rs.weekday = w.weekday
      AND rs.start_time = '08:00:00'
      AND rs.end_time = '18:00:00'
  );
