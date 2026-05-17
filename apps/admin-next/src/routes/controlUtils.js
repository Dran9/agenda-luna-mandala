export function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function formatUpdatedAt(timestamp) {
  if (!timestamp) {
    return "Sin actualizar";
  }

  const time = new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));

  return `Actualizado ${time}`;
}

export function refreshLabel({ isFetching, isLoading, dataUpdatedAt }) {
  return isFetching && !isLoading
    ? "Actualizando"
    : formatUpdatedAt(dataUpdatedAt);
}

export function appointmentsForControl(payload) {
  return payload?.today || [];
}

export function centerSlugForControl(payload) {
  return payload?.center?.slug || "";
}

export function adminSessionLabel(admin) {
  return admin?.fullName || admin?.email || "";
}
