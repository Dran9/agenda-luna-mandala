import { http } from "../../lib/http";
import {
  appointmentDetailPath,
  appointmentPaymentsPath,
  appointmentRoomPath,
  appointmentsPath,
  appointmentStatusPath,
  paymentApprovePath,
  paymentCancelPath,
  paymentRejectPath,
  paymentSubmitPath,
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

export async function createAppointmentPayment({ appointmentId, method, reference, notes }) {
  return http(appointmentPaymentsPath(appointmentId), {
    method: "POST",
    body: JSON.stringify({ method, reference, notes })
  });
}

export async function submitPayment({ paymentId, reference, notes }) {
  return http(paymentSubmitPath(paymentId), {
    method: "POST",
    body: JSON.stringify({ reference, notes })
  });
}

export async function approvePayment({ paymentId, notes }) {
  return http(paymentApprovePath(paymentId), {
    method: "POST",
    body: JSON.stringify({ notes })
  });
}

export async function rejectPayment({ paymentId, reason, notes }) {
  return http(paymentRejectPath(paymentId), {
    method: "POST",
    body: JSON.stringify({ reason, notes })
  });
}

export async function cancelPayment({ paymentId, reason, notes }) {
  return http(paymentCancelPath(paymentId), {
    method: "POST",
    body: JSON.stringify({ reason, notes })
  });
}
