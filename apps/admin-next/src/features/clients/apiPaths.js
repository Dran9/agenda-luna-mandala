function toQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export function clientsPath({ onboarding = "all", q = "" } = {}) {
  return `/api/admin/clients?${toQuery({ onboarding, q, limit: 100 })}`;
}

export function clientDetailPath(clientId) {
  return `/api/admin/clients/${clientId}`;
}
