import { http } from "../../lib/http";
import { therapistPath, therapistsPath } from "./apiPaths.js";

export async function getTherapistsSettings(filters) {
  return http(therapistsPath(filters));
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
