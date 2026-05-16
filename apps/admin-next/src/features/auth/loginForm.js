import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Password obligatorio")
});

export function parseLoginForm(values) {
  return loginFormSchema.safeParse({
    email: String(values.email || ""),
    password: String(values.password || "")
  });
}
