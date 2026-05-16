export function compatibilitiesForSettings(payload) {
  return payload?.settings?.compatibilities || [];
}

export function compatibilitySummary(payload) {
  const compatibilities = compatibilitiesForSettings(payload);
  const activeCount = compatibilities.filter((entry) => entry.status === "ACTIVE" || entry.isActive).length;

  return {
    total: compatibilities.length,
    active: activeCount
  };
}

export function compatibilityRowsForService({ rooms, compatibilities, serviceId }) {
  const selectedServiceId = Number(serviceId);
  const compatibilityByRoomId = new Map();

  for (const entry of compatibilities) {
    if (Number(entry.serviceId) === selectedServiceId) {
      compatibilityByRoomId.set(Number(entry.roomId), entry);
    }
  }

  return rooms.map((room) => {
    const compatibility = compatibilityByRoomId.get(Number(room.id));
    const isActive = compatibility?.status === "ACTIVE" || compatibility?.isActive === true;

    return {
      id: `${selectedServiceId}-${room.id}`,
      roomId: room.id,
      roomName: room.name,
      roomStatus: room.status,
      capacityLabel: room.capacityLabel || "-",
      featuresLabel: room.featuresLabel || "-",
      isActive
    };
  });
}

export function filterCompatibilityRows(rows, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => [
    row.roomName,
    row.capacityLabel,
    row.featuresLabel
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
}

export function selectedServiceIdForCompatibility({ requestedServiceId, services }) {
  const requested = Number(requestedServiceId);
  const firstAvailable = services[0]?.id;

  if (services.some((service) => Number(service.id) === requested)) {
    return requested;
  }

  return firstAvailable ? Number(firstAvailable) : "";
}
