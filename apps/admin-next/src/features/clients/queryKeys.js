export function clientsKey({ onboarding = "all", q = "" } = {}) {
  return ["clients", "admin", { onboarding, q: q.trim() }];
}

export function clientDetailKey(clientId) {
  return ["clients", "detail", Number(clientId)];
}
