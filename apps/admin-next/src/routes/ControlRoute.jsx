import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { AppointmentDetailDrawer } from "../features/appointments/AppointmentDetailDrawer";
import { AppointmentTable } from "../features/appointments/AppointmentTable";
import { ManualAppointmentModal } from "../features/appointments/ManualAppointmentModal";
import {
  ALL_FILTER_VALUE,
  filterAppointments,
  resourceFilterOptions,
  STATUS_FILTER_OPTIONS
} from "../features/appointments/filterUtils";
import { useAppointmentsQuery } from "../features/appointments/queries";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Toolbar } from "../ui/Toolbar";
import {
  appointmentsForControl,
  centerSlugForControl,
  refreshLabel,
  todayKey
} from "./controlUtils";
import { AdminShell } from "./AdminShell";

export function ControlRoute() {
  const { isAuthenticated } = useAuth();
  const [date, setDate] = useState(() => todayKey());
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [filters, setFilters] = useState({
    status: ALL_FILTER_VALUE,
    therapistId: ALL_FILTER_VALUE,
    roomId: ALL_FILTER_VALUE
  });
  const appointmentsQuery = useAppointmentsQuery(date, isAuthenticated);
  const appointments = useMemo(() => appointmentsForControl(appointmentsQuery.data), [appointmentsQuery.data]);
  const visibleAppointments = useMemo(
    () => filterAppointments(appointments, filters),
    [appointments, filters]
  );
  const therapistOptions = useMemo(
    () => resourceFilterOptions(appointments, (appointment) => appointment.therapist, "Todos"),
    [appointments]
  );
  const roomOptions = useMemo(
    () => resourceFilterOptions(appointments, (appointment) => appointment.room, "Todas"),
    [appointments]
  );
  const centerSlug = centerSlugForControl(appointmentsQuery.data);
  const refreshStateLabel = refreshLabel({
    isFetching: appointmentsQuery.isFetching,
    isLoading: appointmentsQuery.isLoading,
    dataUpdatedAt: appointmentsQuery.dataUpdatedAt
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminShell title="Control">
      <Toolbar>
        <Input
          label="Fecha"
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          onInput={(event) => setDate(event.currentTarget.value)}
        />
        <span className="refresh-state">
          {refreshStateLabel}
        </span>
        <Select
          label="Estado"
          name="status"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Select
          label="Terapeuta"
          name="therapistFilter"
          value={filters.therapistId}
          onChange={(event) => setFilters((current) => ({ ...current, therapistId: event.target.value }))}
        >
          {therapistOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Select
          label="Sala"
          name="roomFilter"
          value={filters.roomId}
          onChange={(event) => setFilters((current) => ({ ...current, roomId: event.target.value }))}
        >
          {roomOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <span className="toolbar-spacer" />
        <Button type="button" variant="secondary" onClick={() => appointmentsQuery.refetch()}>
          Actualizar
        </Button>
        <Button type="button" onClick={() => setManualOpen(true)}>
          Nueva cita
        </Button>
      </Toolbar>
      {appointmentsQuery.error ? <p className="form-error">{appointmentsQuery.error.message}</p> : null}
      <AppointmentTable
        appointments={visibleAppointments}
        isInitialLoading={appointmentsQuery.isLoading}
        isRefreshing={appointmentsQuery.isFetching && !appointmentsQuery.isLoading}
        onSelectAppointment={setSelectedAppointmentId}
        selectedAppointmentId={selectedAppointmentId}
      />
      <ManualAppointmentModal
        centerSlug={centerSlug}
        date={date}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
      />
      <AppointmentDetailDrawer
        appointmentId={selectedAppointmentId}
        date={date}
        open={Boolean(selectedAppointmentId)}
        onClose={() => setSelectedAppointmentId(null)}
      />
    </AdminShell>
  );
}
