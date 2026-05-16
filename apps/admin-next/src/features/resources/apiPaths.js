export function resourcesPath() {
  return "/api/admin/resources";
}

export function roomsPath() {
  return "/api/admin/resources/rooms";
}

export function roomPath(roomId) {
  return `/api/admin/resources/rooms/${roomId}`;
}

export function servicesPath() {
  return "/api/admin/resources/services";
}

export function servicePath(serviceId) {
  return `/api/admin/resources/services/${serviceId}`;
}

export function compatibilityPath(serviceId, roomId) {
  return `/api/admin/resources/compatibilities/${serviceId}/${roomId}`;
}
