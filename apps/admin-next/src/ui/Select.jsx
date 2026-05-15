export function Select({ children, error, label, name, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className={error ? "field-control field-control-error" : "field-control"} name={name} {...props}>
        {children}
      </select>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
