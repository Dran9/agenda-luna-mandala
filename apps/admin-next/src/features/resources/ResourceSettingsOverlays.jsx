import { CreateRoomModal } from "./CreateRoomModal";
import { CreateServiceModal } from "./CreateServiceModal";
import { EditRoomDrawer } from "./EditRoomDrawer";
import { EditServiceDrawer } from "./EditServiceDrawer";

export function ResourceSettingsOverlays({
  createRoomOpen,
  createServiceOpen,
  onCloseCreateRoom,
  onCloseCreateService,
  onCloseRoom,
  onCloseService,
  selectedRoom,
  selectedService
}) {
  return (
    <>
      <CreateServiceModal open={createServiceOpen} onClose={onCloseCreateService} />
      <CreateRoomModal open={createRoomOpen} onClose={onCloseCreateRoom} />
      <EditServiceDrawer
        key={selectedService?.id || "service-drawer"}
        service={selectedService}
        open={Boolean(selectedService)}
        onClose={onCloseService}
      />
      <EditRoomDrawer
        key={selectedRoom?.id || "room-drawer"}
        room={selectedRoom}
        open={Boolean(selectedRoom)}
        onClose={onCloseRoom}
      />
    </>
  );
}
