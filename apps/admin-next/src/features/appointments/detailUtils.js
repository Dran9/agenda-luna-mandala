export const STATUS_ACTIONS = {
  pending: [
    { status: "confirmed", label: "Confirmar" },
    { status: "completed", label: "Completar" },
    { status: "cancelled", label: "Cancelar" },
    { status: "no_show", label: "No asistió" }
  ],
  confirmed: [
    { status: "completed", label: "Completar" },
    { status: "cancelled", label: "Cancelar" },
    { status: "no_show", label: "No asistió" }
  ]
};

export function appointmentDetailFromPayload(payload) {
  return payload?.appointment || null;
}

export function statusActionsForAppointment(appointment) {
  return STATUS_ACTIONS[appointment?.status] || [];
}

export function detailValue(value) {
  return value || "-";
}

export function roomChangeAllowed(appointment) {
  return appointment?.status === "pending" || appointment?.status === "confirmed";
}

export function roomOptionsForAppointment(appointment) {
  return appointment?.roomOptions || [];
}

const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  submitted: "En revision",
  approved: "Aprobado",
  rejected: "Rechazado",
  canceled: "Anulado",
  cancelled: "Anulado"
};

const PAYMENT_STATUS_TONES = {
  pending: "pending",
  submitted: "confirmed",
  approved: "completed",
  rejected: "no_show",
  canceled: "cancelled",
  cancelled: "cancelled"
};

const ACTIVE_PAYMENT_STATUSES = new Set(["pending", "submitted", "approved"]);

const currencyFormatter = new Intl.NumberFormat("es-BO", {
  currency: "BOB",
  style: "currency"
});

export function paymentsForAppointment(appointment) {
  return Array.isArray(appointment?.payments) ? appointment.payments : [];
}

export function activePaymentForAppointment(appointment) {
  return paymentsForAppointment(appointment).find((payment) => ACTIVE_PAYMENT_STATUSES.has(payment.status)) || null;
}

export function latestPaymentForAppointment(appointment) {
  return paymentsForAppointment(appointment)[0] || null;
}

export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || status || "-";
}

export function paymentStatusTone(status) {
  return PAYMENT_STATUS_TONES[status] || "default";
}

export function paymentAmountLabel(payment) {
  if (!payment) {
    return "-";
  }

  const amount = Number(payment.amount || 0);
  const currencyCode = payment.currencyCode || "BOB";

  if (currencyCode === "BOB") {
    return currencyFormatter.format(amount);
  }

  return `${amount.toFixed(2)} ${currencyCode}`;
}

export function paymentActionState(payment) {
  if (!payment) {
    return "create";
  }

  if (payment.status === "pending" || payment.status === "rejected") {
    return "submit";
  }

  if (payment.status === "submitted") {
    return "review";
  }

  return "readonly";
}
