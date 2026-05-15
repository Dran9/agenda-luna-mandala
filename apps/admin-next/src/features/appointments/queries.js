import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAppointments, getResources, getTherapists } from "./api";

export const appointmentsKey = (date) => ["appointments", date];

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
    queryKey: ["resources"],
    queryFn: getResources,
    enabled,
    staleTime: 60_000
  });
}

export function useTherapistsQuery(enabled) {
  return useQuery({
    queryKey: ["therapists", "active"],
    queryFn: getTherapists,
    enabled,
    staleTime: 60_000
  });
}
