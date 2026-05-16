import { z } from "zod";

const manualAppointmentFormSchema = z.object({
  serviceId: z.string().min(1, "Servicio obligatorio"),
  clientFirstName: z.string().trim().min(2, "Nombre obligatorio"),
  clientLastName: z.string().trim().min(2, "Apellido obligatorio"),
  phoneE164: z.string().min(1, "WhatsApp obligatorio"),
  therapistId: z.string().optional(),
  roomId: z.string().optional(),
  startsAt: z.string().min(1, "Fecha y hora obligatoria")
});

export function parseManualAppointmentForm(values) {
  return manualAppointmentFormSchema.safeParse(values);
}
