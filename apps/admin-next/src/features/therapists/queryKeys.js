export function adminTherapistsBaseKey() {
  return ["therapists", "admin"];
}

export function adminTherapistsKey({ q = "", status = "all" } = {}) {
  return [...adminTherapistsBaseKey(), { q: q.trim(), status }];
}

export function activeTherapistsKey() {
  return ["therapists", "active"];
}
