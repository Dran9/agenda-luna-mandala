import { appointmentDetailKey, appointmentsKey } from "./queryKeys.js";

export function createAppointmentMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });
    }
  };
}

export function updateAppointmentStatusMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess(payload, variables) {
      const appointmentId = payload?.appointment?.id || variables?.appointmentId;

      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });

      if (appointmentId) {
        await queryClient.invalidateQueries({ queryKey: appointmentDetailKey(appointmentId) });
      }
    }
  };
}

export function updateAppointmentRoomMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess(payload, variables) {
      const appointmentId = payload?.appointment?.id || variables?.appointmentId;

      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });

      if (appointmentId) {
        await queryClient.invalidateQueries({ queryKey: appointmentDetailKey(appointmentId) });
      }
    }
  };
}
