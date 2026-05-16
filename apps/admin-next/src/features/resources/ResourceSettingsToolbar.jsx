import { Button } from "../../ui/Button";
import { Toolbar } from "../../ui/Toolbar";

export function ResourceSettingsToolbar({
  activeSection,
  activeSummary,
  onCompatibilityServiceChange,
  onCreateRoom,
  onCreateService,
  onFilterSubmit,
  onRefresh,
  onSectionChange,
  refreshStateLabel,
  resourceFilter,
  selectedCompatibilityServiceId,
  services
}) {
  return (
    <Toolbar>
      <div className="settings-segment" aria-label="Tipo de ajuste">
        <button type="button" aria-pressed={activeSection === "services"} onClick={() => onSectionChange("services")}>
          Servicios
        </button>
        <button type="button" aria-pressed={activeSection === "rooms"} onClick={() => onSectionChange("rooms")}>
          Salas
        </button>
        <button
          type="button"
          aria-pressed={activeSection === "compatibilities"}
          onClick={() => onSectionChange("compatibilities")}
        >
          Compatibilidad
        </button>
      </div>
      <div className="settings-summary" aria-label="Resumen de ajustes">
        <strong>{activeSummary.total}</strong>
        <span>{activeSummary.active} activos</span>
      </div>
      {activeSection === "compatibilities" ? (
        <label className="settings-compact-select">
          <span>Servicio</span>
          <select value={selectedCompatibilityServiceId} onChange={onCompatibilityServiceChange}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </label>
      ) : null}
      <form className="settings-filter-form" onSubmit={onFilterSubmit}>
        <label className="settings-compact-input">
          <span>Filtrar</span>
          <input name="resourceFilter" defaultValue={resourceFilter} />
        </label>
        <Button type="submit" variant="secondary">Aplicar</Button>
      </form>
      <span className="refresh-state">{refreshStateLabel}</span>
      <span className="toolbar-spacer" />
      <Button type="button" variant="secondary" onClick={onRefresh}>
        Actualizar
      </Button>
      {activeSection === "services" ? (
        <Button type="button" onClick={onCreateService}>Nuevo servicio</Button>
      ) : activeSection === "rooms" ? (
        <Button type="button" onClick={onCreateRoom}>Nueva sala</Button>
      ) : null}
    </Toolbar>
  );
}
