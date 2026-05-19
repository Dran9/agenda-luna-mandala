import { appointmentStatusLabel } from "../appointments/tableUtils.js";

const dateTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short"
});

const refreshTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit"
});

const currencyFormatter = new Intl.NumberFormat("es-BO", {
  currency: "BOB",
  style: "currency"
});

const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  submitted: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  canceled: "Anulado",
  cancelled: "Anulado"
};

export function clientsForAdmin(payload) {
  return payload?.clients || [];
}

export function clientDetailFromPayload(payload) {
  return payload?.client || null;
}

export function clientSummary(payload) {
  const clients = clientsForAdmin(payload);

  return {
    total: clients.length,
    complete: clients.filter((client) => client.onboardingComplete).length
  };
}

export function clientDisplayName(client) {
  return client?.fullName || [client?.firstName, client?.lastName].filter(Boolean).join(" ") || "-";
}

export function clientContact(client) {
  return client?.whatsapp || "-";
}

export function clientOnboardingLabel(client) {
  return client?.onboardingComplete ? "Completo" : "Incompleto";
}

export function clientOnboardingTone(client) {
  return client?.onboardingComplete ? "confirmed" : "pending";
}

export function appointmentSummaryLabel(appointment) {
  if (!appointment) {
    return "-";
  }

  return `${formatClientDateTime(appointment.startsAt)} · ${appointment.serviceName || "-"}`;
}

export function appointmentHistoryLabel(appointment) {
  if (!appointment) {
    return "-";
  }

  return `${appointment.serviceName || "-"} · ${appointmentStatusLabel(appointment.status)}`;
}

export function clientProfileRows(client) {
  return [
    ["Nombre", clientDisplayName(client)],
    ["WhatsApp", clientContact(client)],
    ["Edad", client?.age || "-"],
    ["Ciudad", client?.city || "-"],
    ["Origen", client?.source || "-"],
    ["Creado", formatClientDateTime(client?.createdAt)],
    ["Ficha completa", formatClientDateTime(client?.onboardingCompletedAt)]
  ];
}

export function clientStatsRows(stats = {}) {
  return [
    ["Total", stats.totalAppointments || 0],
    ["Pendientes", stats.pendingCount || 0],
    ["Confirmadas", stats.confirmedCount || 0],
    ["Completadas", stats.completedCount || 0],
    ["Canceladas", stats.cancelledCount || 0],
    ["No asistió", stats.noShowCount || 0]
  ];
}

export function paymentSummaryLabel(payment) {
  if (!payment) {
    return "-";
  }

  const amount = currencyFormatter.format(payment.amount || 0);
  const status = PAYMENT_STATUS_LABELS[payment.status] || payment.status || "-";
  const appointment = payment.appointment?.startsAt
    ? formatClientDateTime(payment.appointment.startsAt)
    : "-";

  return `${amount} · ${status} · ${appointment}`;
}

export function formatClientDateTime(value) {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function clientsRefreshLabel({ isFetching, isLoading, dataUpdatedAt }) {
  if (isFetching && !isLoading) {
    return "Actualizando";
  }

  if (!dataUpdatedAt) {
    return "Sin datos";
  }

  return `Actualizado ${refreshTimeFormatter.format(new Date(dataUpdatedAt))}`;
}
