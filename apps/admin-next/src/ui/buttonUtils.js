const BUTTON_VARIANTS = new Set(["primary", "secondary"]);

export function buttonClassName({ className = "", variant = "primary" } = {}) {
  const safeVariant = BUTTON_VARIANTS.has(variant) ? variant : "primary";
  return ["button", `button-${safeVariant}`, className].filter(Boolean).join(" ");
}
