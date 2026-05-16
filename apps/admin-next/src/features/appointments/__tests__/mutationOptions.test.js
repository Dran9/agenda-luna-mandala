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
