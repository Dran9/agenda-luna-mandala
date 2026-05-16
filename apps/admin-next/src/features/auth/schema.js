import { z } from "zod";

const loginResponseSchema = z.object({
  token: z.string().min(1),
  admin: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string().nullable().optional(),
    role: z.string()
  })
});

export function parseLoginResponse(payload) {
  return loginResponseSchema.parse(payload);
}
