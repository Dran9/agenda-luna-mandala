import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAppointments, getResources, getTherapists } from "./api";
import { appointmentsKey, resourcesKey, therapistsKey } from "./queryKeys";

export { appointmentsKey, resourcesKey, therapistsKey };

export function useAppointmentsQuery(date, enabled = true) {
  return useQuery({
    queryKey: appointmentsKey(date),
    queryFn: () => getAppointments({ date }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000
  });
}

export function useResourcesQuery(enabled) {
  return useQuery({
    queryKey: resourcesKey(),
    queryFn: getResources,
    enabled,
    staleTime: 60_000
  });
}

export function useTherapistsQuery(enabled) {
  return useQuery({
    queryKey: therapistsKey(),
    queryFn: getTherapists,
    enabled,
    staleTime: 60_000
  });
}
