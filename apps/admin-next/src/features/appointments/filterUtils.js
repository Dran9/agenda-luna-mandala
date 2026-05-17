export const ALL_FILTER_VALUE = "all";

export const STATUS_FILTER_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "No asistió" }
];

function optionKey(value) {
  return value === undefined || value === null || value === "" ? "" : String(value);
}

export function resourceFilterOptions(appointments, accessor, allLabel) {
  const options = [{ value: ALL_FILTER_VALUE, label: allLabel }];
  const seen = new Set();

  for (const appointment of appointments) {
    const resource = accessor(appointment);
    const value = optionKey(resource?.id);

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    options.push({ value, label: resource?.name || "-" });
  }

  return options;
}

export function filterAppointments(appointments, filters) {
  return appointments.filter((appointment) => {
    const statusMatches = filters.status === ALL_FILTER_VALUE || appointment.status === filters.status;
    const therapistMatches =
      filters.therapistId === ALL_FILTER_VALUE ||
      optionKey(appointment.therapist?.id) === filters.therapistId;
    const roomMatches =
      filters.roomId === ALL_FILTER_VALUE ||
      optionKey(appointment.room?.id) === filters.roomId;

    return statusMatches && therapistMatches && roomMatches;
  });
}
