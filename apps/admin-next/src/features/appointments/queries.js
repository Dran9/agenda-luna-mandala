import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAppointments, getResources, getTherapists } from "./api";
import { appointmentsKey, resourcesKey, therapistsKey } from "./queryKeys";
import {
  APPOINTMENT_OPTIONS_STALE_TIME_MS,
  APPOINTMENTS_REFETCH_INTERVAL_MS
} from "./querySettings";

export { appointmentsKey, resourcesKey, therapistsKey };

export function useAppointmentsQuery(date, enabled = true) {
  return useQuery({
    queryKey: appointmentsKey(date),
    queryFn: () => getAppointments({ date }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: APPOINTMENTS_REFETCH_INTERVAL_MS
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
