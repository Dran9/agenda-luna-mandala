import { appointmentDetailKey, appointmentsKey } from "./queryKeys.js";

function dateKeyFromStartsAt(value) {
  if (!value) {
    return "";
  }

  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : "";
}

export function createAppointmentMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess(payload, variables) {
      const createdDate = dateKeyFromStartsAt(
        payload?.appointment?.startsAt
          || payload?.creation?.startsAt
          || variables?.startsAt
      );
      const datesToInvalidate = Array.from(new Set([date, createdDate].filter(Boolean)));

      for (const dateKey of datesToInvalidate) {
        await queryClient.invalidateQueries({ queryKey: appointmentsKey(dateKey) });
      }
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

export function paymentMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess(payload, variables) {
      const appointmentId = payload?.payment?.appointmentId || variables?.appointmentId;

      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });

      if (appointmentId) {
        await queryClient.invalidateQueries({ queryKey: appointmentDetailKey(appointmentId) });
      }
    }
  };
}
