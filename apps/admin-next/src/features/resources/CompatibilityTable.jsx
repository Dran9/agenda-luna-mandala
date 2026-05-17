import { useState } from "react";

import { Chip } from "../../ui/Chip";
import { useUpdateCompatibilityMutation } from "./mutations";

function CompatibilitySkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={`compatibility-skeleton-${index}`}>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function CompatibilityTable({ isInitialLoading, isRefreshing, rows, serviceId }) {
  const updateMutation = useUpdateCompatibilityMutation();
  const [pendingId, setPendingId] = useState(null);

  async function handleToggle(row) {
    setPendingId(row.id);

    try {
      await updateMutation.mutateAsync({
        serviceId,
        roomId: row.roomId,
        isActive: !row.isActive
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="table-frame settings-table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table settings-table">
        <thead>
          <tr>
            <th>Sala</th>
            <th>Capacidad</th>
            <th>Recursos</th>
            <th>Estado</th>
            <th>Compatible</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <CompatibilitySkeletonRows /> : null}
          {!isInitialLoading && rows.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="5">Sin salas para este servicio.</td>
            </tr>
          ) : null}
          {!isInitialLoading && rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.roomName}</strong></td>
              <td>{row.capacityLabel}</td>
              <td>{row.featuresLabel}</td>
              <td>
                <Chip tone={row.roomStatus === "ACTIVE" ? "confirmed" : "cancelled"}>
                  {row.roomStatus === "ACTIVE" ? "Activo" : "Inactivo"}
                </Chip>
              </td>
              <td>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    disabled={pendingId === row.id || updateMutation.isPending}
                    onChange={() => handleToggle(row)}
                  />
                  <span>{row.isActive ? "Sí" : "No"}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
