import { z } from "zod";

import { http } from "../../lib/http";

const loginResponseSchema = z.object({
  token: z.string().min(1),
  admin: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string().nullable().optional(),
    role: z.string()
  })
});

export async function loginAdmin({ email, password }) {
  const payload = await http("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  return loginResponseSchema.parse(payload);
}
