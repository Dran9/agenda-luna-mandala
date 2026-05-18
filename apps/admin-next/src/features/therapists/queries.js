import { useQuery } from "@tanstack/react-query";

import { getTherapistDetail, getTherapistsSettings } from "./api";
import { adminTherapistDetailKey, adminTherapistsKey } from "./queryKeys";

export function useTherapistsSettingsQuery(enabled, filters) {
  return useQuery({
    queryKey: adminTherapistsKey(filters),
    queryFn: () => getTherapistsSettings(filters),
    enabled
  });
}

export function useTherapistDetailQuery(enabled, therapistId) {
  return useQuery({
    queryKey: adminTherapistDetailKey(therapistId),
    queryFn: () => getTherapistDetail(therapistId),
    enabled: enabled && Boolean(therapistId)
  });
}
