const CHIP_TONES = new Set([
  "default",
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show"
]);

export function chipClassName(tone = "default") {
  const safeTone = CHIP_TONES.has(tone) ? tone : "default";
  return `chip chip-${safeTone}`;
}
