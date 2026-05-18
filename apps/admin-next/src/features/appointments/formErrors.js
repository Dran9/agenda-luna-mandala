export function firstFieldError(fieldErrors, fieldName) {
  const error = fieldErrors?.[fieldName];
  return Array.isArray(error) ? error[0] : error || "";
}
