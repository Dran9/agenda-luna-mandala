const { ValidationError } = require("./errors");
const { paymentStatusToApi, paymentStatusToDb } = require("./paymentStatus");

const PAYMENT_METHODS = new Set(["transfer", "cash", "card", "other"]);
const ACTIVE_PAYMENT_DB_STATUSES = ["pending", "submitted", "approved"];
const EDITABLE_DB_STATUSES = new Set(["pending", "submitted", "rejected"]);

class AdminPaymentsError extends Error {
  constructor({
    message = "No se pudo completar la operacion admin de pagos",
    code = "ADMIN_PAYMENTS_ERROR",
    status = 400,
    details = {}
  } = {}) {
    super(message);
    this.name = "AdminPaymentsError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function parseAdminCenterId(adminSession) {
  const parsed = Number.parseInt(adminSession?.centerId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseAdminUserId(adminSession) {
  const parsed = Number.parseInt(adminSession?.adminId, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveId(rawValue, field) {
  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${field} invalido`, {
      field,
      value: rawValue
    });
  }

  return parsed;
}

function normalizeMethod(rawMethod) {
  const normalized = String(rawMethod || "transfer").trim().toLowerCase();

  if (!PAYMENT_METHODS.has(normalized)) {
    throw new ValidationError("method invalido", {
      field: "method",
      allowed: Array.from(PAYMENT_METHODS)
    });
  }

  return normalized;
}

function normalizeOptionalText(rawValue, field, maxLength = 500) {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  const normalized = String(rawValue).trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} demasiado largo`, {
      field,
      maxLength
    });
  }

  return normalized;
}

function rejectUnsupportedAmountOverride(amount, currencyCode) {
  if (amount !== undefined && amount !== null && amount !== "") {
    throw new ValidationError("amount no editable en C0", {
      field: "amount"
    });
  }

  if (currencyCode !== undefined && currencyCode !== null && currencyCode !== "") {
    throw new ValidationError("currencyCode no editable en C0", {
      field: "currencyCode"
    });
  }
}

function normalizeEvidence({ reference, notes, proofFileId }) {
  const normalizedReference = normalizeOptionalText(reference, "reference", 180);
  const normalizedNotes = normalizeOptionalText(notes, "notes", 1000);
  const normalizedProofFileId =
    proofFileId === undefined || proofFileId === null || proofFileId === ""
      ? null
      : parsePositiveId(proofFileId, "proofFileId");

  if (!normalizedReference && !normalizedNotes && !normalizedProofFileId) {
    throw new AdminPaymentsError({
      status: 422,
      code: "PAYMENT_EVIDENCE_REQUIRED",
      message: "Se requiere referencia, nota o comprobante"
    });
  }

  return {
    reference: normalizedReference,
    notes: normalizedNotes,
    proofFileId: normalizedProofFileId
  };
}

function combineReviewNotes(reason, notes) {
  const normalizedReason = normalizeOptionalText(reason, "reason", 500);
  const normalizedNotes = normalizeOptionalText(notes, "notes", 1000);

  if (!normalizedReason && !normalizedNotes) {
    throw new AdminPaymentsError({
      status: 422,
      code: "PAYMENT_REVIEW_NOTE_REQUIRED",
      message: "Se requiere nota o motivo"
    });
  }

  return [normalizedReason, normalizedNotes].filter(Boolean).join("\n");
}

function mapPaymentRow(row) {
  return {
    id: Number(row.id),
    appointmentId: Number(row.appointmentId),
    status: paymentStatusToApi(row.status),
    amount: Number(row.amount),
    currencyCode: row.currencyCode,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    proofFileId: row.proofFileId === null || row.proofFileId === undefined ? null : Number(row.proofFileId),
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : null,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt).toISOString() : null,
    canceledAt: row.canceledAt ? new Date(row.canceledAt).toISOString() : null,
    reviewedByAdminUserId:
      row.reviewedByAdminUserId === null || row.reviewedByAdminUserId === undefined
        ? null
        : Number(row.reviewedByAdminUserId),
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
  };
}

async function getPaymentByIdForUpdate(connection, centerId, paymentId) {
  const [rows] = await connection.query(
    `SELECT
      id,
      appointment_id AS appointmentId,
      status,
      amount,
      currency_code AS currencyCode,
      method,
      reference,
      notes,
      proof_file_id AS proofFileId,
      submitted_at AS submittedAt,
      approved_at AS approvedAt,
      rejected_at AS rejectedAt,
      canceled_at AS canceledAt,
      reviewed_by_admin_user_id AS reviewedByAdminUserId,
      reviewed_at AS reviewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
     FROM payments
     WHERE center_id = ?
       AND id = ?
     LIMIT 1
     FOR UPDATE`,
    [centerId, paymentId]
  );

  if (rows.length === 0) {
    throw new AdminPaymentsError({
      status: 404,
      code: "PAYMENT_NOT_FOUND",
      message: "Pago no encontrado"
    });
  }

  return rows[0];
}

async function getPaymentById(connection, centerId, paymentId) {
  const [rows] = await connection.query(
    `SELECT
      id,
      appointment_id AS appointmentId,
      status,
      amount,
      currency_code AS currencyCode,
      method,
      reference,
      notes,
      proof_file_id AS proofFileId,
      submitted_at AS submittedAt,
      approved_at AS approvedAt,
      rejected_at AS rejectedAt,
      canceled_at AS canceledAt,
      reviewed_by_admin_user_id AS reviewedByAdminUserId,
      reviewed_at AS reviewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
     FROM payments
     WHERE center_id = ?
       AND id = ?
     LIMIT 1`,
    [centerId, paymentId]
  );

  if (rows.length === 0) {
    throw new AdminPaymentsError({
      status: 404,
      code: "PAYMENT_NOT_FOUND",
      message: "Pago no encontrado"
    });
  }

  return rows[0];
}

async function assertProofFileBelongsToCenter(connection, centerId, proofFileId) {
  if (!proofFileId) {
    return;
  }

  const [rows] = await connection.query(
    `SELECT id
     FROM files
     WHERE center_id = ?
       AND id = ?
     LIMIT 1`,
    [centerId, proofFileId]
  );

  if (rows.length === 0) {
    throw new AdminPaymentsError({
      status: 404,
      code: "PAYMENT_PROOF_FILE_NOT_FOUND",
      message: "Comprobante no encontrado"
    });
  }
}

function ensureCenter(adminSession) {
  const centerId = parseAdminCenterId(adminSession);
  if (!centerId) {
    throw new ValidationError("Sesion admin sin centerId", {
      field: "adminSession.centerId"
    });
  }

  return centerId;
}

async function createAdminAppointmentPayment({
  connection,
  adminSession,
  appointmentId: rawAppointmentId,
  method,
  reference,
  notes,
  amount,
  currencyCode
}) {
  const centerId = ensureCenter(adminSession);
  const appointmentId = parsePositiveId(rawAppointmentId, "appointmentId");
  const normalizedMethod = normalizeMethod(method);
  const normalizedReference = normalizeOptionalText(reference, "reference", 180);
  const normalizedNotes = normalizeOptionalText(notes, "notes", 1000);
  rejectUnsupportedAmountOverride(amount, currencyCode);

  await connection.beginTransaction();

  try {
    const [appointmentRows] = await connection.query(
      `SELECT
        a.id,
        a.service_id AS serviceId,
        a.therapist_id AS therapistId,
        ts.price_amount AS priceAmount,
        ts.currency_code AS currencyCode
       FROM appointments a
       LEFT JOIN therapist_services ts
         ON ts.center_id = a.center_id
        AND ts.therapist_id = a.therapist_id
        AND ts.service_id = a.service_id
        AND ts.is_active = 1
       WHERE a.center_id = ?
         AND a.id = ?
       LIMIT 1
       FOR UPDATE`,
      [centerId, appointmentId]
    );

    if (appointmentRows.length === 0) {
      throw new AdminPaymentsError({
        status: 404,
        code: "APPOINTMENT_NOT_FOUND",
        message: "Cita no encontrada"
      });
    }

    const appointment = appointmentRows[0];
    const priceAmount = Number(appointment.priceAmount || 0);
    const snapshotCurrencyCode = String(appointment.currencyCode || "").trim().toUpperCase();

    if (!Number.isFinite(priceAmount) || priceAmount <= 0 || !/^[A-Z]{3}$/.test(snapshotCurrencyCode)) {
      throw new AdminPaymentsError({
        status: 422,
        code: "PAYMENT_ARANCEL_NOT_CONFIGURED",
        message: "No se pudo derivar arancel terapeuta-servicio",
        details: {
          appointmentId,
          therapistId: Number(appointment.therapistId),
          serviceId: Number(appointment.serviceId)
        }
      });
    }

    const [activeRows] = await connection.query(
      `SELECT id
       FROM payments
       WHERE center_id = ?
         AND appointment_id = ?
         AND status IN (?, ?, ?)
       LIMIT 1
       FOR UPDATE`,
      [centerId, appointmentId, ...ACTIVE_PAYMENT_DB_STATUSES]
    );

    if (activeRows.length > 0) {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_ACTIVE_EXISTS",
        message: "Ya existe un pago activo para la cita"
      });
    }

    const [result] = await connection.query(
      `INSERT INTO payments (
        center_id,
        appointment_id,
        status,
        amount,
        currency_code,
        method,
        reference,
        notes
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        centerId,
        appointmentId,
        priceAmount,
        snapshotCurrencyCode,
        normalizedMethod,
        normalizedReference,
        normalizedNotes
      ]
    );

    const payment = await getPaymentById(connection, centerId, Number(result.insertId));
    await connection.commit();
    return { payment: mapPaymentRow(payment) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function updateAdminPayment({
  connection,
  adminSession,
  paymentId: rawPaymentId,
  method,
  reference,
  notes
}) {
  const centerId = ensureCenter(adminSession);
  const paymentId = parsePositiveId(rawPaymentId, "paymentId");
  const updates = [];
  const params = [];

  if (method !== undefined) {
    updates.push("method = ?");
    params.push(normalizeMethod(method));
  }

  if (reference !== undefined) {
    updates.push("reference = ?");
    params.push(normalizeOptionalText(reference, "reference", 180));
  }

  if (notes !== undefined) {
    updates.push("notes = ?");
    params.push(normalizeOptionalText(notes, "notes", 1000));
  }

  if (updates.length === 0) {
    throw new ValidationError("payload de pago vacio", {
      field: "body"
    });
  }

  await connection.beginTransaction();

  try {
    const payment = await getPaymentByIdForUpdate(connection, centerId, paymentId);
    if (!EDITABLE_DB_STATUSES.has(payment.status)) {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_NOT_EDITABLE",
        message: "Pago no editable"
      });
    }

    params.push(centerId, paymentId);
    await connection.query(
      `UPDATE payments
       SET ${updates.join(", ")}
       WHERE center_id = ?
         AND id = ?`,
      params
    );

    const updated = await getPaymentById(connection, centerId, paymentId);
    await connection.commit();
    return { payment: mapPaymentRow(updated) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function submitAdminPayment({
  connection,
  adminSession,
  paymentId: rawPaymentId,
  reference,
  notes,
  proofFileId,
  now = new Date()
}) {
  const centerId = ensureCenter(adminSession);
  const paymentId = parsePositiveId(rawPaymentId, "paymentId");
  const evidence = normalizeEvidence({ reference, notes, proofFileId });

  await connection.beginTransaction();

  try {
    const payment = await getPaymentByIdForUpdate(connection, centerId, paymentId);
    if (!["pending", "rejected"].includes(payment.status)) {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_INVALID_TRANSITION",
        message: "Transicion de pago invalida"
      });
    }

    await assertProofFileBelongsToCenter(connection, centerId, evidence.proofFileId);

    await connection.query(
      `UPDATE payments
       SET status = 'submitted',
           reference = COALESCE(?, reference),
           notes = COALESCE(?, notes),
           proof_file_id = COALESCE(?, proof_file_id),
           submitted_at = ?
       WHERE center_id = ?
         AND id = ?`,
      [evidence.reference, evidence.notes, evidence.proofFileId, now, centerId, paymentId]
    );

    const updated = await getPaymentById(connection, centerId, paymentId);
    await connection.commit();
    return { payment: mapPaymentRow(updated) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function approveAdminPayment({
  connection,
  adminSession,
  paymentId: rawPaymentId,
  notes,
  now = new Date()
}) {
  const centerId = ensureCenter(adminSession);
  const adminUserId = parseAdminUserId(adminSession);
  const paymentId = parsePositiveId(rawPaymentId, "paymentId");
  const normalizedNotes = normalizeOptionalText(notes, "notes", 1000);

  await connection.beginTransaction();

  try {
    const payment = await getPaymentByIdForUpdate(connection, centerId, paymentId);
    const canApproveSubmitted = payment.status === "submitted";
    const canApproveCashPending = payment.status === "pending" && payment.method === "cash" && normalizedNotes;

    if (!canApproveSubmitted && !canApproveCashPending) {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_INVALID_TRANSITION",
        message: "Transicion de pago invalida"
      });
    }

    await connection.query(
      `UPDATE payments
       SET status = 'approved',
           notes = COALESCE(?, notes),
           approved_at = ?,
           reviewed_at = ?,
           reviewed_by_admin_user_id = ?
       WHERE center_id = ?
         AND id = ?`,
      [normalizedNotes, now, now, adminUserId, centerId, paymentId]
    );

    const updated = await getPaymentById(connection, centerId, paymentId);
    await connection.commit();
    return { payment: mapPaymentRow(updated) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function rejectAdminPayment({
  connection,
  adminSession,
  paymentId: rawPaymentId,
  reason,
  notes,
  now = new Date()
}) {
  const centerId = ensureCenter(adminSession);
  const adminUserId = parseAdminUserId(adminSession);
  const paymentId = parsePositiveId(rawPaymentId, "paymentId");
  const reviewNotes = combineReviewNotes(reason, notes);

  await connection.beginTransaction();

  try {
    const payment = await getPaymentByIdForUpdate(connection, centerId, paymentId);
    if (payment.status !== "submitted") {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_INVALID_TRANSITION",
        message: "Transicion de pago invalida"
      });
    }

    await connection.query(
      `UPDATE payments
       SET status = 'rejected',
           notes = ?,
           rejected_at = ?,
           reviewed_at = ?,
           reviewed_by_admin_user_id = ?
       WHERE center_id = ?
         AND id = ?`,
      [reviewNotes, now, now, adminUserId, centerId, paymentId]
    );

    const updated = await getPaymentById(connection, centerId, paymentId);
    await connection.commit();
    return { payment: mapPaymentRow(updated) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function cancelAdminPayment({
  connection,
  adminSession,
  paymentId: rawPaymentId,
  reason,
  notes,
  now = new Date()
}) {
  const centerId = ensureCenter(adminSession);
  const paymentId = parsePositiveId(rawPaymentId, "paymentId");
  const reviewNotes = combineReviewNotes(reason, notes);

  await connection.beginTransaction();

  try {
    const payment = await getPaymentByIdForUpdate(connection, centerId, paymentId);
    if (!["pending", "submitted", "rejected"].includes(payment.status)) {
      throw new AdminPaymentsError({
        status: 409,
        code: "PAYMENT_INVALID_TRANSITION",
        message: "Transicion de pago invalida"
      });
    }

    await connection.query(
      `UPDATE payments
       SET status = ?,
           notes = ?,
           canceled_at = ?
       WHERE center_id = ?
         AND id = ?`,
      [paymentStatusToDb("canceled"), reviewNotes, now, centerId, paymentId]
    );

    const updated = await getPaymentById(connection, centerId, paymentId);
    await connection.commit();
    return { payment: mapPaymentRow(updated) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

module.exports = {
  ACTIVE_PAYMENT_DB_STATUSES,
  AdminPaymentsError,
  approveAdminPayment,
  cancelAdminPayment,
  createAdminAppointmentPayment,
  mapPaymentRow,
  rejectAdminPayment,
  submitAdminPayment,
  updateAdminPayment
};
