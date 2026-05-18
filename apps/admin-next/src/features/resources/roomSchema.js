import { z } from "zod";

const createRoomFormSchema = z.object({
  name: z.string().trim().min(2, "Nombre obligatorio").max(160, "Nombre demasiado largo"),
  capacity: z.coerce.number().int("Capacidad invalida").min(1, "Capacidad minima 1").max(50, "Capacidad maxima 50"),
  camilla: z.string().optional(),
  mesa: z.string().optional()
});

const updateRoomFormSchema = createRoomFormSchema.extend({
  isActive: z.enum(["true", "false"])
});

export function parseCreateRoomForm(values) {
  return createRoomFormSchema.safeParse(values);
}

export function parseUpdateRoomForm(values) {
  return updateRoomFormSchema.safeParse(values);
}
