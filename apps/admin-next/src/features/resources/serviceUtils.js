import { ROOM_FEATURE_OPTIONS } from "./roomUtils.js";

export function servicesForSettings(payload) {
  return payload?.settings?.services || [];
}

export function serviceSummary(payload) {
  const services = servicesForSettings(payload);
  const activeCount = services.filter((service) => service.status === "ACTIVE" || service.isActive).length;

  return {
    total: services.length,
    active: activeCount
  };
}

export function filterServices(services, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return services;
  }

  return services.filter((service) => [
    service.name,
    service.requiredFeaturesLabel,
    service.compatibleRoomsLabel,
    service.activeTherapistsLabel
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
}

export function buildCreateServicePayload(values) {
  return {
    name: values.name.trim(),
    durationMinutes: Number(values.durationMinutes),
    priceAmount: Number(values.priceAmount || 0),
    requiredFeatureKeys: ROOM_FEATURE_OPTIONS
      .filter((feature) => values[feature.key] === "on")
      .map((feature) => feature.key)
  };
}

export function buildUpdateServicePayload(values) {
  return {
    ...buildCreateServicePayload(values),
    isActive: values.isActive === "true"
  };
}
