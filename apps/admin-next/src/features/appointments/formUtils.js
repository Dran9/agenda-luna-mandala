export function toIsoDateTime(value) {
  return new Date(value).toISOString();
}

export function emptyToNull(value) {
  return value ? value : null;
}

export function defaultStartsAt(date) {
  return date ? `${date}T09:00` : "";
}

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("WhatsApp debe tener entre 7 y 15 digitos.");
  }

  return digits;
}

export function formatPhoneDisplay(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("591") && digits.length > 3) {
    const local = digits.slice(3);
    const localGroups = local.length > 4
      ? [local.slice(0, 4), local.slice(4)]
      : [local];

    return ["591", ...localGroups].filter(Boolean).join(" ");
  }

  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function buildManualAppointmentPayload({ centerSlug, values }) {
  return {
    tenantSlug: centerSlug,
    phoneE164: normalizePhone(values.phoneE164),
    clientFullName: values.clientFullName.trim(),
    serviceId: values.serviceId,
    therapistId: emptyToNull(values.therapistId),
    roomId: emptyToNull(values.roomId),
    startsAt: toIsoDateTime(values.startsAt)
  };
}
