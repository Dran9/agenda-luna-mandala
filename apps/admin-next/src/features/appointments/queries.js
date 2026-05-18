import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAppointmentDetail, getAppointments, getResources, getTherapists } from "./api";
import {
  appointmentDetailKey,
  appointmentsKey,
  resourcesKey,
  therapistsKey
} from "./queryKeys";
import {
  APPOINTMENT_OPTIONS_STALE_TIME_MS,
  APPOINTMENTS_REFETCH_INTERVAL_MS
} from "./querySettings";

export { appointmentDetailKey, appointmentsKey, resourcesKey, therapistsKey };

export function useAppointmentsQuery(date, enabled = true) {
  return useQuery({
    queryKey: appointmentsKey(date),
    queryFn: () => getAppointments({ date }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: APPOINTMENTS_REFETCH_INTERVAL_MS
  });
}

export function useAppointmentDetailQuery(appointmentId) {
  return useQuery({
    queryKey: appointmentDetailKey(appointmentId),
    queryFn: () => getAppointmentDetail(appointmentId),
    enabled: Boolean(appointmentId)
  });
}

export function useResourcesQuery(enabled) {
  return useQuery({
    queryKey: resourcesKey(),
    queryFn: getResources,
    enabled,
    staleTime: APPOINTMENT_OPTIONS_STALE_TIME_MS
  });
}

export function useTherapistsQuery(enabled) {
  return useQuery({
    queryKey: therapistsKey(),
    queryFn: getTherapists,
    enabled,
    staleTime: APPOINTMENT_OPTIONS_STALE_TIME_MS
  });
}
