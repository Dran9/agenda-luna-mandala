function toQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export function appointmentsPath({ date }) {
  return `/api/admin/appointments?${toQuery({ date, upcoming: 0, limit: 80 })}`;
}

export function appointmentDetailPath(appointmentId) {
  return `/api/admin/appointments/${appointmentId}`;
}

export function appointmentStatusPath(appointmentId) {
  return `/api/admin/appointments/${appointmentId}/status`;
}

export function appointmentRoomPath(appointmentId) {
  return `/api/admin/appointments/${appointmentId}/room`;
}

export function resourcesPath() {
  return "/api/admin/resources";
}

export function therapistsPath() {
  return `/api/admin/therapists?${toQuery({ status: "active", limit: 100 })}`;
}
