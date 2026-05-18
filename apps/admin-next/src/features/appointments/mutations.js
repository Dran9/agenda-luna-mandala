import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  approvePayment,
  cancelPayment,
  createAppointment,
  createAppointmentPayment,
  rejectPayment,
  submitPayment,
  updateAppointmentRoom,
  updateAppointmentStatus
} from "./api";
import {
  createAppointmentMutationOptions,
  paymentMutationOptions,
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

function usePaymentMutation(date, mutationFn) {
  const queryClient = useQueryClient();

  return useMutation(paymentMutationOptions({
    date,
    mutationFn,
    queryClient
  }));
}

export function useCreateAppointmentPaymentMutation(date) {
  return usePaymentMutation(date, createAppointmentPayment);
}

export function useSubmitPaymentMutation(date) {
  return usePaymentMutation(date, submitPayment);
}

export function useApprovePaymentMutation(date) {
  return usePaymentMutation(date, approvePayment);
}

export function useRejectPaymentMutation(date) {
  return usePaymentMutation(date, rejectPayment);
}

export function useCancelPaymentMutation(date) {
  return usePaymentMutation(date, cancelPayment);
}
