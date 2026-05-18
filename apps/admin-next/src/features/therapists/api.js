import { http } from "../../lib/http";
import { therapistPath, therapistsPath, therapistServicePath } from "./apiPaths.js";

export async function getTherapistsSettings(filters) {
  return http(therapistsPath(filters));
}

export async function getTherapistDetail(therapistId) {
  return http(therapistPath(therapistId));
}

export async function createTherapist(payload) {
  return http("/api/admin/therapists", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateTherapist({ therapistId, payload }) {
  return http(therapistPath(therapistId), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function updateTherapistService({ therapistId, serviceId, isActive }) {
  return http(therapistServicePath({ therapistId, serviceId }), {
    method: "PATCH",
    body: JSON.stringify({ isActive })
  });
}
