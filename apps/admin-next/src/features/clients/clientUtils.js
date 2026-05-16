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
