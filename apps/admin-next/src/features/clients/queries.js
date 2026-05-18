import { useQuery } from "@tanstack/react-query";

import { getClientDetail, getClients } from "./api";
import { clientDetailKey, clientsKey } from "./queryKeys";

export function useClientsQuery(enabled, filters) {
  return useQuery({
    queryKey: clientsKey(filters),
    queryFn: () => getClients(filters),
    enabled
  });
}

export function useClientDetailQuery(clientId) {
  return useQuery({
    queryKey: clientDetailKey(clientId),
    queryFn: () => getClientDetail(clientId),
    enabled: Boolean(clientId)
  });
}
