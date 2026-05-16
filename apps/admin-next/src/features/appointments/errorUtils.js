export function appointmentErrorToFieldErrors(error) {
  if (error.message?.startsWith("WhatsApp")) {
    return { phoneE164: [error.message] };
  }

  if (error.status === 409 || error.code === "SLOT_OCCUPIED") {
    return { startsAt: [error.message] };
  }

  return { form: [error.message || "No se pudo crear la cita."] };
}
