ALTER TABLE therapist_services
  ADD COLUMN price_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER priority,
  ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'BOB' AFTER price_amount,
  ADD KEY idx_therapist_services_price (center_id, service_id, price_amount);

UPDATE therapist_services ts
INNER JOIN services s
  ON s.center_id = ts.center_id
 AND s.id = ts.service_id
SET ts.price_amount = s.price_amount,
    ts.currency_code = s.currency_code
WHERE ts.price_amount = 0;

ALTER TABLE payments
  ADD COLUMN reference VARCHAR(180) NULL AFTER method,
  ADD COLUMN submitted_at DATETIME NULL AFTER proof_file_id,
  ADD COLUMN approved_at DATETIME NULL AFTER reviewed_at,
  ADD COLUMN rejected_at DATETIME NULL AFTER approved_at,
  ADD COLUMN canceled_at DATETIME NULL AFTER rejected_at,
  ADD KEY idx_payments_reference (center_id, reference);

UPDATE payments
SET approved_at = reviewed_at
WHERE status = 'approved'
  AND approved_at IS NULL
  AND reviewed_at IS NOT NULL;
