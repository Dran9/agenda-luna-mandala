import { http } from "../../lib/http";

function toQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export async function getAppointments({ date }) {
  return http(`/api/admin/appointments?${toQuery({ date, upcoming: 0, limit: 80 })}`);
}
