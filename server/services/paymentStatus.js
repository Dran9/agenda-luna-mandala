const PAYMENT_API_STATUSES = new Set(["pending", "submitted", "approved", "rejected", "canceled"]);
const PAYMENT_DB_STATUSES = new Set(["pending", "submitted", "approved", "rejected", "cancelled"]);

function paymentStatusToDb(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "canceled") {
    return "cancelled";
  }

  if (PAYMENT_DB_STATUSES.has(normalized)) {
    return normalized;
  }

  throw new Error(`Estado de pago invalido para DB: ${status}`);
}

function paymentStatusToApi(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "cancelled") {
    return "canceled";
  }

  if (PAYMENT_API_STATUSES.has(normalized)) {
    return normalized;
  }

  throw new Error(`Estado de pago invalido para API: ${status}`);
}

function paymentStatusLabel(status) {
  const apiStatus = paymentStatusToApi(status);
  const labels = {
    pending: "Pendiente",
    submitted: "En revision",
    approved: "Aprobado",
    rejected: "Rechazado",
    canceled: "Anulado"
  };

  return labels[apiStatus];
}

module.exports = {
  PAYMENT_API_STATUSES,
  PAYMENT_DB_STATUSES,
  paymentStatusLabel,
  paymentStatusToApi,
  paymentStatusToDb
};
