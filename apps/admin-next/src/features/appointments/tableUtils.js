const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistio"
};

export function formatAppointmentTime(value) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function appointmentStatusLabel(status) {
  return STATUS_LABELS[status] || status || "-";
}
