import { http } from "../../lib/http";
import { appointmentsPath, resourcesPath, therapistsPath } from "./apiPaths";

export async function getAppointments({ date }) {
  return http(appointmentsPath({ date }));
}

export async function getResources() {
  return http(resourcesPath());
}

export async function getTherapists() {
  return http(therapistsPath());
}

export async function createAppointment(payload) {
  return http("/api/admin/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
