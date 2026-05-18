export function appointmentErrorToFieldErrors(error) {
  const field = error?.details?.field;

  if (field === "clientFullName") {
    return { clientFirstName: [error.message] };
  }

  if (field) {
    return { [field]: [error.message] };
  }

  if (error.message?.startsWith("WhatsApp")) {
    return { phoneE164: [error.message] };
  }

  if (error.status === 409 || error.code === "SLOT_OCCUPIED") {
    return { startsAt: [error.message] };
  }

  return { form: [error.message || "No se pudo crear la cita."] };
}
