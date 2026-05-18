import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getResourcesSettings } from "./api.js";
import { resourcesKey } from "./queryKeys.js";

export { resourcesKey };

export function useResourcesSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: resourcesKey(),
    queryFn: getResourcesSettings,
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000
  });
}
