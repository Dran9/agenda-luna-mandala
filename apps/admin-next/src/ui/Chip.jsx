import { chipClassName } from "./chipUtils";

export function Chip({ children, tone = "default" }) {
  return <span className={chipClassName(tone)}>{children}</span>;
}
