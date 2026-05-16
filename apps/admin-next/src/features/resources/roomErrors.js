export function roomErrorToFieldErrors(error) {
  const field = error?.details?.field;

  if (field) {
    return { [field]: [error.message] };
  }

  return { form: [error?.message || "No se pudo guardar la sala."] };
}
