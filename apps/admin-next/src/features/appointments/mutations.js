import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAppointment, updateAppointmentRoom, updateAppointmentStatus } from "./api";
import {
  createAppointmentMutationOptions,
  updateAppointmentRoomMutationOptions,
  updateAppointmentStatusMutationOptions
} from "./mutationOptions";

export function useCreateAppointmentMutation(date) {
  const queryClient = useQueryClient();

  return useMutation(createAppointmentMutationOptions({
    date,
    mutationFn: createAppointment,
    queryClient
  }));
}

export function useUpdateAppointmentStatusMutation(date) {
  const queryClient = useQueryClient();

  return useMutation(updateAppointmentStatusMutationOptions({
    date,
    mutationFn: updateAppointmentStatus,
    queryClient
  }));
}

export function useUpdateAppointmentRoomMutation(date) {
  const queryClient = useQueryClient();

  return useMutation(updateAppointmentRoomMutationOptions({
    date,
    mutationFn: updateAppointmentRoom,
    queryClient
  }));
}
