import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { ResourceSettingsOverlays } from "../features/resources/ResourceSettingsOverlays";
import { ResourceSettingsTable } from "../features/resources/ResourceSettingsTable";
import { ResourceSettingsToolbar } from "../features/resources/ResourceSettingsToolbar";
import { useResourcesSettingsQuery } from "../features/resources/queries";
import {
  filterRooms,
  resourcesRefreshLabel,
  roomsForSettings,
  roomSummary
} from "../features/resources/roomUtils";
import {
  filterServices,
  servicesForSettings,
  serviceSummary
} from "../features/resources/serviceUtils";
import {
  compatibilitiesForSettings,
  compatibilityRowsForService,
  compatibilitySummary,
  filterCompatibilityRows,
  selectedServiceIdForCompatibility
} from "../features/resources/compatibilityUtils";
import { useAuth } from "../features/auth/AuthContext";
import { AdminShell } from "./AdminShell";

export function SettingsRoute() {
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState("services");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [compatibilityServiceId, setCompatibilityServiceId] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const resourcesQuery = useResourcesSettingsQuery(isAuthenticated);
  const services = useMemo(() => servicesForSettings(resourcesQuery.data), [resourcesQuery.data]);
  const rooms = useMemo(() => roomsForSettings(resourcesQuery.data), [resourcesQuery.data]);
  const compatibilities = useMemo(
    () => compatibilitiesForSettings(resourcesQuery.data),
    [resourcesQuery.data]
  );
  const servicesSummary = useMemo(() => serviceSummary(resourcesQuery.data), [resourcesQuery.data]);
  const summary = useMemo(() => roomSummary(resourcesQuery.data), [resourcesQuery.data]);
  const compatibilityTotals = useMemo(
    () => compatibilitySummary(resourcesQuery.data),
    [resourcesQuery.data]
  );
  const refreshStateLabel = resourcesRefreshLabel({
    isFetching: resourcesQuery.isFetching,
    isLoading: resourcesQuery.isLoading,
    dataUpdatedAt: resourcesQuery.dataUpdatedAt
  });
  const activeSummary = activeSection === "services"
    ? servicesSummary
    : activeSection === "rooms"
      ? summary
      : compatibilityTotals;
  const isRefreshing = resourcesQuery.isFetching && !resourcesQuery.isLoading;
  const selectedCompatibilityServiceId = selectedServiceIdForCompatibility({
    requestedServiceId: compatibilityServiceId,
    services
  });
  const compatibilityRows = useMemo(() => compatibilityRowsForService({
    rooms,
    compatibilities,
    serviceId: selectedCompatibilityServiceId
  }), [compatibilities, rooms, selectedCompatibilityServiceId]);
  const visibleServices = useMemo(() => filterServices(services, resourceFilter), [resourceFilter, services]);
  const visibleRooms = useMemo(() => filterRooms(rooms, resourceFilter), [resourceFilter, rooms]);
  const visibleCompatibilityRows = useMemo(
    () => filterCompatibilityRows(compatibilityRows, resourceFilter),
    [compatibilityRows, resourceFilter]
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setResourceFilter(String(form.get("resourceFilter") || "").trim());
  }

  return (
    <AdminShell title="Ajustes">
      <ResourceSettingsToolbar
        activeSection={activeSection}
        activeSummary={activeSummary}
        onCompatibilityServiceChange={(event) => setCompatibilityServiceId(event.target.value)}
        onCreateRoom={() => setCreateRoomOpen(true)}
        onCreateService={() => setCreateServiceOpen(true)}
        onFilterSubmit={handleFilterSubmit}
        onRefresh={() => resourcesQuery.refetch()}
        onSectionChange={setActiveSection}
        refreshStateLabel={refreshStateLabel}
        resourceFilter={resourceFilter}
        selectedCompatibilityServiceId={selectedCompatibilityServiceId}
        services={services}
      />
      {resourcesQuery.error ? <p className="form-error">{resourcesQuery.error.message}</p> : null}
      <ResourceSettingsTable
        activeSection={activeSection}
        compatibilityRows={visibleCompatibilityRows}
        isInitialLoading={resourcesQuery.isLoading}
        isRefreshing={isRefreshing}
        onEditRoom={setSelectedRoom}
        onEditService={setSelectedService}
        rooms={visibleRooms}
        serviceId={selectedCompatibilityServiceId}
        services={visibleServices}
      />
      <ResourceSettingsOverlays
        createRoomOpen={createRoomOpen}
        createServiceOpen={createServiceOpen}
        onCloseCreateRoom={() => setCreateRoomOpen(false)}
        onCloseCreateService={() => setCreateServiceOpen(false)}
        onCloseRoom={() => setSelectedRoom(null)}
        onCloseService={() => setSelectedService(null)}
        selectedRoom={selectedRoom}
        selectedService={selectedService}
      />
    </AdminShell>
  );
}
