import { CompatibilityTable } from "./CompatibilityTable";
import { RoomTable } from "./RoomTable";
import { ServiceTable } from "./ServiceTable";

export function ResourceSettingsTable({
  activeSection,
  isInitialLoading,
  isRefreshing,
  onEditRoom,
  onEditService,
  rooms,
  serviceId,
  services,
  compatibilityRows
}) {
  if (activeSection === "compatibilities") {
    return (
      <CompatibilityTable
        rows={compatibilityRows}
        serviceId={serviceId}
        isInitialLoading={isInitialLoading}
        isRefreshing={isRefreshing}
      />
    );
  }

  if (activeSection === "services") {
    return (
      <ServiceTable
        services={services}
        isInitialLoading={isInitialLoading}
        isRefreshing={isRefreshing}
        onEditService={onEditService}
      />
    );
  }

  return (
    <RoomTable
      rooms={rooms}
      isInitialLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      onEditRoom={onEditRoom}
    />
  );
}
