import {
  activeTherapistsKey,
  adminTherapistDetailKey,
  adminTherapistsBaseKey
} from "./queryKeys.js";

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
    async onSuccess(data, variables) {
      if (variables?.therapistId) {
        queryClient.setQueryData(adminTherapistDetailKey(variables.therapistId), data);
        await queryClient.invalidateQueries({ queryKey: adminTherapistDetailKey(variables.therapistId) });
      }
      await queryClient.invalidateQueries({ queryKey: adminTherapistsBaseKey() });
      await queryClient.invalidateQueries({ queryKey: activeTherapistsKey() });
    }
  };
}

export function updateTherapistServiceMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess(data, variables) {
      if (variables?.therapistId) {
        queryClient.setQueryData(adminTherapistDetailKey(variables.therapistId), data);
        await queryClient.invalidateQueries({ queryKey: adminTherapistDetailKey(variables.therapistId) });
      }
      await queryClient.invalidateQueries({ queryKey: adminTherapistsBaseKey() });
      await queryClient.invalidateQueries({ queryKey: activeTherapistsKey() });
    }
  };
}
