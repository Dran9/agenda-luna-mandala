import { http } from "../../lib/http";
import { clientDetailPath, clientsPath } from "./apiPaths.js";

export async function getClients(filters) {
  return http(clientsPath(filters));
}

export async function getClientDetail(clientId) {
  return http(clientDetailPath(clientId));
}
