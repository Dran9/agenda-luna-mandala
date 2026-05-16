export function therapistErrorToFieldErrors(error) {
  const field = error?.details?.field;

  if (field) {
    return { [field]: [error.message] };
  }

  return { form: [error?.message || "No se pudo guardar el terapeuta."] };
}
