import { http } from "../../lib/http";
import {
  appointmentDetailPath,
  appointmentRoomPath,
  appointmentsPath,
  appointmentStatusPath,
  resourcesPath,
  therapistsPath
} from "./apiPaths";

export async function getAppointments({ date }) {
  return http(appointmentsPath({ date }));
}

export async function getAppointmentDetail(appointmentId) {
  return http(appointmentDetailPath(appointmentId));
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

export async function updateAppointmentStatus({ appointmentId, status }) {
  return http(appointmentStatusPath(appointmentId), {
    method: "POST",
    body: JSON.stringify({ status })
  });
}

export async function updateAppointmentRoom({ appointmentId, roomId }) {
  return http(appointmentRoomPath(appointmentId), {
    method: "POST",
    body: JSON.stringify({ roomId })
  });
}
