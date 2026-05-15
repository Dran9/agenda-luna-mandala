export function Button({ children, className = "", variant = "primary", ...props }) {
  const classes = ["button", `button-${variant}`, className].filter(Boolean).join(" ");
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
