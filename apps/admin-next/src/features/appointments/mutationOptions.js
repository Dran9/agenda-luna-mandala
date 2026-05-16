import { appointmentsKey } from "./queryKeys.js";

export function createAppointmentMutationOptions({ date, mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: appointmentsKey(date) });
    }
  };
}
