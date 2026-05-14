CREATE TABLE IF NOT EXISTS service_room_requirements (
  center_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  feature_key VARCHAR(40) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, service_id, feature_key),
  INDEX idx_service_room_requirements_center_feature (center_id, feature_key),
  CONSTRAINT fk_service_room_requirements_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_room_requirements_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO service_room_requirements (center_id, service_id, feature_key, is_active)
SELECT c.id, s.id, 'mesa', 1
FROM centers c
INNER JOIN services s ON s.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND s.is_active = 1
  AND (
    LOWER(s.name) LIKE '%tarot%'
    OR LOWER(s.name) LIKE '%carta astral%'
    OR LOWER(s.name) LIKE '%registro ak%'
  )
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO service_room_requirements (center_id, service_id, feature_key, is_active)
SELECT c.id, s.id, 'camilla', 1
FROM centers c
INNER JOIN services s ON s.center_id = c.id
WHERE c.slug = 'luna-mandala'
  AND s.is_active = 1
  AND (
    LOWER(s.name) LIKE '%masaje%'
    OR LOWER(s.name) LIKE '%craneosacral%'
    OR LOWER(s.name) LIKE '%osteopat%'
    OR LOWER(s.name) LIKE '%reiki%'
    OR LOWER(s.name) LIKE '%bioenerg%'
    OR LOWER(s.name) LIKE '%chakra%'
    OR LOWER(s.name) LIKE '%aura%'
    OR LOWER(s.name) LIKE '%lazo%'
    OR LOWER(s.name) LIKE '%aromaterapia%'
  )
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
