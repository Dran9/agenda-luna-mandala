function toQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export function therapistsPath({ q = "", status = "all" } = {}) {
  return `/api/admin/therapists?${toQuery({ q, status, limit: 100 })}`;
}

export function therapistPath(therapistId) {
  return `/api/admin/therapists/${therapistId}`;
}
