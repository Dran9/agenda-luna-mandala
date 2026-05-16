import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTherapist, updateTherapist } from "./api";
import {
  createTherapistMutationOptions,
  updateTherapistMutationOptions
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
