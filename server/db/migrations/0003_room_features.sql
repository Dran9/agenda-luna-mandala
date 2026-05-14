CREATE TABLE IF NOT EXISTS room_features (
  center_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  feature_key VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, room_id, feature_key),
  INDEX idx_room_features_center_feature (center_id, feature_key),
  CONSTRAINT fk_room_features_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_features_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
