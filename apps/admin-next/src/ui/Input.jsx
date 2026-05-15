export function Input({ error, label, name, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className={error ? "field-control field-control-error" : "field-control"} name={name} {...props} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
