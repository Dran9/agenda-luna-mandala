import { http } from "../../lib/http";
import {
  compatibilityPath,
  resourcesPath,
  roomPath,
  roomsPath,
  servicePath,
  servicesPath
} from "./apiPaths.js";

export async function getResourcesSettings() {
  return http(resourcesPath());
}

export async function createRoom(payload) {
  return http(roomsPath(), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRoom({ roomId, payload }) {
  return http(roomPath(roomId), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createService(payload) {
  return http(servicesPath(), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateService({ serviceId, payload }) {
  return http(servicePath(serviceId), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function updateCompatibility({ serviceId, roomId, isActive }) {
  return http(compatibilityPath(serviceId, roomId), {
    method: "PATCH",
    body: JSON.stringify({ isActive })
  });
}
