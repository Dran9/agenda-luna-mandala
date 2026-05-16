import { activeTherapistsKey, adminTherapistsBaseKey } from "./queryKeys.js";

export function createTherapistMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: adminTherapistsBaseKey() });
      await queryClient.invalidateQueries({ queryKey: activeTherapistsKey() });
    }
  };
}

export function updateTherapistMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: adminTherapistsBaseKey() });
      await queryClient.invalidateQueries({ queryKey: activeTherapistsKey() });
    }
  };
}
