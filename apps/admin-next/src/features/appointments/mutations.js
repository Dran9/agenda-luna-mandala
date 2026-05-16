import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAppointment } from "./api";
import { createAppointmentMutationOptions } from "./mutationOptions";

export function useCreateAppointmentMutation(date) {
  const queryClient = useQueryClient();

  return useMutation(createAppointmentMutationOptions({
    date,
    mutationFn: createAppointment,
    queryClient
  }));
}
