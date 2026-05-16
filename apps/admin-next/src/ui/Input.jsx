import { fieldControlClassName } from "./fieldUtils";

export function Input({ error, label, name, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className={fieldControlClassName({ error })} name={name} {...props} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
