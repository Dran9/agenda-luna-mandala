import assert from "node:assert/strict";
import test from "node:test";

import { createAppointmentMutationOptions } from "../mutationOptions.js";

test("createAppointmentMutationOptions invalidates appointments for the selected date", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ id: "appointment-1" });

  const options = createAppointmentMutationOptions({
    date: "2026-05-18",
    mutationFn,
    queryClient
  });

  assert.equal(options.mutationFn, mutationFn);
  await options.onSuccess();

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] }
  ]);
});

test("createAppointmentMutationOptions also invalidates the created appointment date", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };

  const options = createAppointmentMutationOptions({
    date: "2026-05-18",
    mutationFn: async () => ({ id: "appointment-1" }),
    queryClient
  });

  await options.onSuccess(
    { appointment: { startsAt: "2026-05-19T20:00:00.000Z" } },
    { startsAt: "2026-05-19T20:00:00.000Z" }
  );

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] },
    { queryKey: ["appointments", "2026-05-19"] }
  ]);
});

test("updateAppointmentStatusMutationOptions invalidates table and drawer detail", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ appointment: { id: 42 } });

  const { updateAppointmentStatusMutationOptions } = await import("../mutationOptions.js");
  const options = updateAppointmentStatusMutationOptions({
    date: "2026-05-18",
    mutationFn,
    queryClient
  });

  await options.onSuccess({ appointment: { id: 42 } });

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] },
    { queryKey: ["appointments", "detail", 42] }
  ]);
});

test("updateAppointmentStatusMutationOptions falls back to variables for detail invalidation", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };

  const { updateAppointmentStatusMutationOptions } = await import("../mutationOptions.js");
  const options = updateAppointmentStatusMutationOptions({
    date: "2026-05-18",
    mutationFn: async () => ({ appointment: {} }),
    queryClient
  });

  await options.onSuccess({ appointment: {} }, { appointmentId: 42 });

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] },
    { queryKey: ["appointments", "detail", 42] }
  ]);
});

test("updateAppointmentRoomMutationOptions invalidates table and drawer detail", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };
  const mutationFn = async () => ({ appointment: { id: 42 } });

  const { updateAppointmentRoomMutationOptions } = await import("../mutationOptions.js");
  const options = updateAppointmentRoomMutationOptions({
    date: "2026-05-18",
    mutationFn,
    queryClient
  });

  await options.onSuccess({ appointment: { id: 42 } });

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] },
    { queryKey: ["appointments", "detail", 42] }
  ]);
});

test("updateAppointmentRoomMutationOptions falls back to variables for detail invalidation", async () => {
  const invalidations = [];
  const queryClient = {
    async invalidateQueries(payload) {
      invalidations.push(payload);
    }
  };

  const { updateAppointmentRoomMutationOptions } = await import("../mutationOptions.js");
  const options = updateAppointmentRoomMutationOptions({
    date: "2026-05-18",
    mutationFn: async () => ({ appointment: {} }),
    queryClient
  });

  await options.onSuccess({ appointment: {} }, { appointmentId: 42 });

  assert.deepEqual(invalidations, [
    { queryKey: ["appointments", "2026-05-18"] },
    { queryKey: ["appointments", "detail", 42] }
  ]);
});
