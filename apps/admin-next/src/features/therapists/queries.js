import { useQuery } from "@tanstack/react-query";

import { getTherapistsSettings } from "./api";
import { adminTherapistsKey } from "./queryKeys";

export function useTherapistsSettingsQuery(enabled, filters) {
  return useQuery({
    queryKey: adminTherapistsKey(filters),
    queryFn: () => getTherapistsSettings(filters),
    enabled
  });
}
