import { z } from "zod";

const therapistBaseSchema = z.object({
  fullName: z.string().trim().min(2, "Nombre obligatorio").max(160, "Nombre demasiado largo"),
  displayName: z.string().trim().max(120, "Nombre visible demasiado largo").optional(),
  phone: z.string().trim().max(40, "Teléfono demasiado largo").optional(),
  telegramChatId: z.string().trim().max(100, "Telegram demasiado largo").optional()
});

const updateTherapistFormSchema = therapistBaseSchema.extend({
  isActive: z.enum(["true", "false"])
});

export function parseCreateTherapistForm(values) {
  return therapistBaseSchema.safeParse(values);
}

export function parseUpdateTherapistForm(values) {
  return updateTherapistFormSchema.safeParse(values);
}
