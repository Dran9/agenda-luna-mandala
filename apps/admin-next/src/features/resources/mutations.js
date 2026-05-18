import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRoom, createService, updateCompatibility, updateRoom, updateService } from "./api";
import {
  createRoomMutationOptions,
  createServiceMutationOptions,
  updateCompatibilityMutationOptions,
  updateRoomMutationOptions,
  updateServiceMutationOptions
} from "./mutationOptions";

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation(createRoomMutationOptions({
    mutationFn: createRoom,
    queryClient
  }));
}

export function useUpdateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateRoomMutationOptions({
    mutationFn: updateRoom,
    queryClient
  }));
}

export function useCreateServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation(createServiceMutationOptions({
    mutationFn: createService,
    queryClient
  }));
}

export function useUpdateServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateServiceMutationOptions({
    mutationFn: updateService,
    queryClient
  }));
}

export function useUpdateCompatibilityMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateCompatibilityMutationOptions({
    mutationFn: updateCompatibility,
    queryClient
  }));
}
