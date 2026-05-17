import { Chip } from "../../ui/Chip";
import { Button } from "../../ui/Button";

function RoomSkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={`room-skeleton-${index}`}>
      <td><span className="skeleton-cell skeleton-wide" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-medium" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
      <td><span className="skeleton-cell skeleton-short" /></td>
    </tr>
  ));
}

export function RoomTable({ isInitialLoading, isRefreshing, onEditRoom, rooms }) {
  return (
    <div className="table-frame settings-table-frame" data-refreshing={isRefreshing ? "true" : "false"}>
      <table className="appointments-table settings-table">
        <thead>
          <tr>
            <th>Sala</th>
            <th>Capacidad</th>
            <th>Recursos</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {isInitialLoading ? <RoomSkeletonRows /> : null}
          {!isInitialLoading && rooms.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="5">Sin salas.</td>
            </tr>
          ) : null}
          {!isInitialLoading && rooms.map((room) => (
            <tr key={room.id}>
              <td>
                <strong>{room.name}</strong>
                <span>{room.compatibleServicesCount || 0} servicios</span>
              </td>
              <td>{room.capacityLabel || "-"}</td>
              <td>{room.featuresLabel || "-"}</td>
              <td>
                <Chip tone={room.status === "ACTIVE" ? "confirmed" : "cancelled"}>
                  {room.statusLabel || "Sin estado"}
                </Chip>
              </td>
              <td>
                <Button type="button" variant="secondary" onClick={() => onEditRoom(room)}>
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
