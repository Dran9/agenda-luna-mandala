const refreshTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit"
});

function emptyToNull(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

export function therapistsForSettings(payload) {
  return payload?.therapists || [];
}

export function therapistSummary(payload) {
  const therapists = therapistsForSettings(payload);

  return {
    total: therapists.length,
    active: therapists.filter((therapist) => therapist.status === "ACTIVE" || therapist.isActive).length
  };
}

export function buildCreateTherapistPayload(values) {
  return {
    fullName: values.fullName.trim(),
    displayName: emptyToNull(values.displayName),
    phone: emptyToNull(values.phone),
    telegramChatId: emptyToNull(values.telegramChatId),
    isActive: true
  };
}

export function buildUpdateTherapistPayload(values) {
  return {
    ...buildCreateTherapistPayload(values),
    isActive: values.isActive === "true"
  };
}

export function serviceAssignmentRows(payload) {
  return (payload?.availableServices || []).map((service) => ({
    id: service.id,
    name: service.name,
    durationLabel: `${service.durationMinutes || 0} min`,
    isAssigned: Boolean(service.relationIsActive),
    isServiceActive: service.serviceStatus
      ? service.serviceStatus === "ACTIVE"
      : service.isActive !== false,
    statusLabel: service.serviceStatusLabel || (service.isActive === false ? "Servicio inactivo" : "Servicio activo")
  }));
}

export function therapistsRefreshLabel({ isFetching, isLoading, dataUpdatedAt }) {
  if (isFetching && !isLoading) {
    return "Actualizando";
  }

  if (!dataUpdatedAt) {
    return "Sin datos";
  }

  return `Actualizado ${refreshTimeFormatter.format(new Date(dataUpdatedAt))}`;
}
