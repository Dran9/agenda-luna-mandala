export const STATUS_ACTIONS = {
  pending: [
    { status: "confirmed", label: "Confirmar" },
    { status: "completed", label: "Completar" },
    { status: "cancelled", label: "Cancelar" },
    { status: "no_show", label: "No asistió" }
  ],
  confirmed: [
    { status: "completed", label: "Completar" },
    { status: "cancelled", label: "Cancelar" },
    { status: "no_show", label: "No asistió" }
  ]
};

export function appointmentDetailFromPayload(payload) {
  return payload?.appointment || null;
}

export function statusActionsForAppointment(appointment) {
  return STATUS_ACTIONS[appointment?.status] || [];
}

export function detailValue(value) {
  return value || "-";
}

export function roomChangeAllowed(appointment) {
  return appointment?.status === "pending" || appointment?.status === "confirmed";
}

export function roomOptionsForAppointment(appointment) {
  return appointment?.roomOptions || [];
}
