import assert from "node:assert/strict";
import test from "node:test";

import {
  createRoomMutationOptions,
  createServiceMutationOptions,
  updateCompatibilityMutationOptions,
  updateRoomMutationOptions,
  updateServiceMutationOptions
} from "../mutationOptions.js";

test("createRoomMutationOptions invalidates resources settings", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 10, name: "Sala Norte" });
  const options = createRoomMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["resources"] }
  ]);
});

test("updateRoomMutationOptions invalidates resources settings", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 10, name: "Sala Norte" });
  const options = updateRoomMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["resources"] }
  ]);
});

test("createServiceMutationOptions invalidates resources settings", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 10, name: "Masaje" });
  const options = createServiceMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["resources"] }
  ]);
});

test("updateServiceMutationOptions invalidates resources settings", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: 10, name: "Masaje" });
  const options = updateServiceMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["resources"] }
  ]);
});

test("updateCompatibilityMutationOptions invalidates resources settings", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: "1-2", status: "ACTIVE" });
  const options = updateCompatibilityMutationOptions({ mutationFn, queryClient });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["resources"] }
  ]);
});
