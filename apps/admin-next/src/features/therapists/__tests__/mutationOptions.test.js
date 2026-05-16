import assert from "node:assert/strict";
import test from "node:test";

import {
  createTherapistMutationOptions,
  updateTherapistMutationOptions
} from "../mutationOptions.js";

test("createTherapistMutationOptions invalidates admin and active therapist caches", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 1 });
  const options = createTherapistMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["therapists", "admin"] },
    { queryKey: ["therapists", "active"] }
  ]);
});

test("updateTherapistMutationOptions invalidates admin and active therapist caches", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 1 });
  const options = updateTherapistMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["therapists", "admin"] },
    { queryKey: ["therapists", "active"] }
  ]);
});
