export const ROOM_FEATURE_OPTIONS = [
  { key: "camilla", label: "Camilla" },
  { key: "mesa", label: "Mesa" }
];

const refreshTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  minute: "2-digit"
});

export function roomsForSettings(payload) {
  return payload?.settings?.rooms || [];
}

export function roomSummary(payload) {
  const rooms = roomsForSettings(payload);
  const activeCount = rooms.filter((room) => room.status === "ACTIVE" || room.isActive).length;

  return {
    total: rooms.length,
    active: activeCount
  };
}

export function filterRooms(rooms, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return rooms;
  }

  return rooms.filter((room) => [
    room.name,
    room.featuresLabel,
    room.capacityLabel
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
}

export function buildCreateRoomPayload(values) {
  return {
    name: values.name.trim(),
    capacity: Number(values.capacity),
    featureKeys: ROOM_FEATURE_OPTIONS
      .filter((feature) => values[feature.key] === "on")
      .map((feature) => feature.key)
  };
}

export function buildUpdateRoomPayload(values) {
  return {
    ...buildCreateRoomPayload(values),
    isActive: values.isActive === "true"
  };
}

export function resourcesRefreshLabel({ isFetching, isLoading, dataUpdatedAt }) {
  if (isFetching && !isLoading) {
    return "Actualizando";
  }

  if (!dataUpdatedAt) {
    return "Sin datos";
  }

  return `Actualizado ${refreshTimeFormatter.format(new Date(dataUpdatedAt))}`;
}
