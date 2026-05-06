CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  version VARCHAR(128) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schema_migrations_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/La_Paz',
  currency_code CHAR(3) NOT NULL DEFAULT 'BOB',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_centers_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS center_settings (
  center_id BIGINT UNSIGNED NOT NULL,
  booking_policy_json JSON NOT NULL,
  messaging_provider VARCHAR(32) NOT NULL DEFAULT 'test_outbox',
  cancellation_window_hours SMALLINT UNSIGNED NOT NULL DEFAULT 6,
  cancellation_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 50,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id),
  CONSTRAINT fk_center_settings_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(180) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'staff') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email),
  KEY idx_admin_users_center (center_id),
  CONSTRAINT fk_admin_users_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
  storage_key VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by_admin_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_files_center (center_id),
  KEY idx_files_uploaded_by (uploaded_by_admin_user_id),
  CONSTRAINT fk_files_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_files_uploaded_by FOREIGN KEY (uploaded_by_admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  buffer_before_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  buffer_after_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  price_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'BOB',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_center_slug (center_id, slug),
  KEY idx_services_center_active (center_id, is_active),
  CONSTRAINT fk_services_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS therapists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(120) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  display_name VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  telegram_chat_id VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_therapists_center_slug (center_id, slug),
  KEY idx_therapists_center_active (center_id, is_active),
  CONSTRAINT fk_therapists_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS therapist_services (
  center_id BIGINT UNSIGNED NOT NULL,
  therapist_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  priority SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, therapist_id, service_id),
  KEY idx_therapist_services_service (service_id),
  CONSTRAINT fk_therapist_services_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_therapist_services_therapist FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
  CONSTRAINT fk_therapist_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_center_slug (center_id, slug),
  KEY idx_rooms_center_active (center_id, is_active),
  CONSTRAINT fk_rooms_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_rooms (
  center_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (center_id, service_id, room_id),
  KEY idx_service_rooms_room (room_id),
  CONSTRAINT fk_service_rooms_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_rooms_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_rooms_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resource_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  resource_type ENUM('therapist', 'room') NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  valid_from DATE NULL,
  valid_to DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resource_schedule_slot (center_id, resource_type, resource_id, weekday, start_time, end_time),
  KEY idx_resource_schedule_lookup (center_id, resource_type, weekday, is_active),
  CONSTRAINT fk_resource_schedules_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resource_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  resource_type ENUM('therapist', 'room') NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  created_by_admin_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_resource_blocks_lookup (center_id, resource_type, resource_id, starts_at),
  KEY idx_resource_blocks_admin_user (created_by_admin_user_id),
  CONSTRAINT fk_resource_blocks_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_resource_blocks_admin_user FOREIGN KEY (created_by_admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  whatsapp_e164 VARCHAR(40) NOT NULL,
  email VARCHAR(180) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_center_whatsapp (center_id, whatsapp_e164),
  KEY idx_clients_center_active (center_id, is_active),
  CONSTRAINT fk_clients_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  public_code VARCHAR(40) NOT NULL,
  hold_token VARCHAR(120) NULL,
  management_token VARCHAR(120) NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  therapist_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending',
  source ENUM('public_booking', 'admin_manual', 'system') NOT NULL DEFAULT 'public_booking',
  cancellation_reason VARCHAR(255) NULL,
  cancelled_at DATETIME NULL,
  completed_at DATETIME NULL,
  no_show_at DATETIME NULL,
  created_by_admin_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_public_code (public_code),
  UNIQUE KEY uq_appointments_hold_token (hold_token),
  UNIQUE KEY uq_appointments_management_token (management_token),
  KEY idx_appointments_calendar (center_id, starts_at, status),
  KEY idx_appointments_client (client_id),
  KEY idx_appointments_service (service_id),
  KEY idx_appointments_therapist (therapist_id),
  KEY idx_appointments_room (room_id),
  CONSTRAINT fk_appointments_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_therapist FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_admin_user FOREIGN KEY (created_by_admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_resource_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NOT NULL,
  resource_type ENUM('therapist', 'room') NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  claim_time DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claims_resource_minute (center_id, resource_type, resource_id, claim_time),
  KEY idx_claims_appointment (appointment_id),
  CONSTRAINT fk_claims_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_claims_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'submitted', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'BOB',
  method ENUM('transfer', 'cash', 'card', 'other') NOT NULL DEFAULT 'transfer',
  proof_file_id BIGINT UNSIGNED NULL,
  reviewed_by_admin_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_center_status (center_id, status),
  KEY idx_payments_appointment (appointment_id),
  KEY idx_payments_proof_file (proof_file_id),
  KEY idx_payments_reviewed_by (reviewed_by_admin_user_id),
  CONSTRAINT fk_payments_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_proof_file FOREIGN KEY (proof_file_id) REFERENCES files(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_reviewed_by FOREIGN KEY (reviewed_by_admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wa_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NULL,
  appointment_id BIGINT UNSIGNED NULL,
  direction ENUM('outbound', 'inbound') NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'test_outbox',
  template_key VARCHAR(64) NULL,
  payload_json JSON NULL,
  status ENUM('queued', 'sent', 'failed', 'received') NOT NULL DEFAULT 'queued',
  sent_at DATETIME NULL,
  error_message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wa_messages_center_status (center_id, status),
  KEY idx_wa_messages_client (client_id),
  KEY idx_wa_messages_appointment (appointment_id),
  CONSTRAINT fk_wa_messages_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_wa_messages_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_wa_messages_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  job_type VARCHAR(64) NOT NULL,
  run_at DATETIME NOT NULL,
  payload_json JSON NULL,
  status ENUM('pending', 'running', 'done', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  locked_at DATETIME NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scheduled_jobs_queue (center_id, status, run_at),
  CONSTRAINT fk_scheduled_jobs_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS round_robin_state (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  last_therapist_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_round_robin_service (center_id, service_id),
  KEY idx_round_robin_last_therapist (last_therapist_id),
  CONSTRAINT fk_round_robin_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_round_robin_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_round_robin_therapist FOREIGN KEY (last_therapist_id) REFERENCES therapists(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telegram_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  therapist_id BIGINT UNSIGNED NOT NULL,
  telegram_user_id VARCHAR(100) NULL,
  telegram_chat_id VARCHAR(100) NULL,
  link_token VARCHAR(120) NOT NULL,
  linked_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_telegram_links_token (link_token),
  UNIQUE KEY uq_telegram_links_therapist (center_id, therapist_id),
  CONSTRAINT fk_telegram_links_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_telegram_links_therapist FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  actor_type ENUM('system', 'admin', 'client', 'therapist') NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_center_entity (center_id, entity_type, entity_id),
  KEY idx_audit_logs_center_action (center_id, action),
  CONSTRAINT fk_audit_logs_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  scope VARCHAR(64) NOT NULL,
  idem_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_code INT NULL,
  response_json JSON NULL,
  locked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_scope_key (center_id, scope, idem_key),
  KEY idx_idempotency_locked_until (locked_until),
  CONSTRAINT fk_idempotency_center FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
