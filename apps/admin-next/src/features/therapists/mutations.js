import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTherapist, updateTherapist, updateTherapistService } from "./api";
import {
  createTherapistMutationOptions,
  updateTherapistMutationOptions,
  updateTherapistServiceMutationOptions
} from "./mutationOptions";

export function useCreateTherapistMutation() {
  const queryClient = useQueryClient();

  return useMutation(createTherapistMutationOptions({
    mutationFn: createTherapist,
    queryClient
  }));
}

export function useUpdateTherapistMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateTherapistMutationOptions({
    mutationFn: updateTherapist,
    queryClient
  }));
}

export function useUpdateTherapistServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation(updateTherapistServiceMutationOptions({
    mutationFn: updateTherapistService,
    queryClient
  }));
}
