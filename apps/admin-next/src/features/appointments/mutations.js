import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAppointment } from "./api";
import { appointmentsKey } from "./queries";

export function useCreateAppointmentMutation(date) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAppointment,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });
    }
  });
}
