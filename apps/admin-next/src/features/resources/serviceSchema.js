import { z } from "zod";

const serviceBaseSchema = z.object({
  name: z.string().trim().min(2, "Nombre obligatorio").max(160, "Nombre demasiado largo"),
  durationMinutes: z.coerce
    .number()
    .int("Duración inválida")
    .min(15, "Duración mínima 15")
    .max(480, "Duración máxima 480"),
  priceAmount: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? 0 : value),
    z.coerce.number().min(0, "Precio mínimo 0").max(999999, "Precio máximo 999999")
  ),
  camilla: z.string().optional(),
  mesa: z.string().optional()
});

const updateServiceFormSchema = serviceBaseSchema.extend({
  isActive: z.enum(["true", "false"])
});

export function parseCreateServiceForm(values) {
  return serviceBaseSchema.safeParse(values);
}

export function parseUpdateServiceForm(values) {
  return updateServiceFormSchema.safeParse(values);
}
