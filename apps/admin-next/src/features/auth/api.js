import { http } from "../../lib/http";
import { parseLoginResponse } from "./schema";

export async function loginAdmin({ email, password }) {
  const payload = await http("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  return parseLoginResponse(payload);
}
