import assert from "node:assert/strict";
import test from "node:test";

import {
  createTherapistMutationOptions,
  updateTherapistMutationOptions,
  updateTherapistServiceMutationOptions
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

test("updateTherapistMutationOptions updates detail and invalidates therapist caches", async () => {
  const invalidations = [];
  const writes = [];
  const queryClient = {
    setQueryData(...args) {
      writes.push(args);
    },
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 1 });
  const options = updateTherapistMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess({ therapist: { id: 1 } }, { therapistId: 8 });

  assert.deepEqual(writes, [
    [["therapists", "admin", "detail", 8], { therapist: { id: 1 } }]
  ]);
  assert.deepEqual(invalidations, [
    { queryKey: ["therapists", "admin", "detail", 8] },
    { queryKey: ["therapists", "admin"] },
    { queryKey: ["therapists", "active"] }
  ]);
});

test("updateTherapistServiceMutationOptions invalidates list, detail, and active caches", async () => {
  const invalidations = [];
  const writes = [];
  const queryClient = {
    setQueryData(...args) {
      writes.push(args);
    },
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ availableServices: [{ id: 4, relationIsActive: false }] });
  const options = updateTherapistServiceMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess(
    { availableServices: [{ id: 4, relationIsActive: false }] },
    { therapistId: "8", serviceId: 4, isActive: false }
  );

  assert.deepEqual(writes, [
    [
      ["therapists", "admin", "detail", 8],
      { availableServices: [{ id: 4, relationIsActive: false }] }
    ]
  ]);
  assert.deepEqual(invalidations, [
    { queryKey: ["therapists", "admin", "detail", 8] },
    { queryKey: ["therapists", "admin"] },
    { queryKey: ["therapists", "active"] }
  ]);
});
