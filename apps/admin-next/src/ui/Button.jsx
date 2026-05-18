import { buttonClassName } from "./buttonUtils";

export function Button({ children, className = "", variant = "primary", ...props }) {
  return (
    <button className={buttonClassName({ className, variant })} {...props}>
      {children}
    </button>
  );
}
