import { resourcesKey } from "./queryKeys.js";

export function createRoomMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: resourcesKey() });
    }
  };
}

export function updateRoomMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: resourcesKey() });
    }
  };
}

export function createServiceMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: resourcesKey() });
    }
  };
}

export function updateServiceMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: resourcesKey() });
    }
  };
}

export function updateCompatibilityMutationOptions({ mutationFn, queryClient }) {
  return {
    mutationFn,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: resourcesKey() });
    }
  };
}
