import { useEffect } from "react";

import { shouldCloseModalOnKey } from "./modalUtils";

export function Drawer({ children, onClose, open, title }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (shouldCloseModalOnKey(event)) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        aria-modal="true"
        className="drawer-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h2>{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>x</button>
        </header>
        {children}
      </aside>
    </div>
  );
}
