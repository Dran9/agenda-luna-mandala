import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAppointments } from "./api";

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
