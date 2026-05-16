import assert from "node:assert/strict";
import test from "node:test";

import { queryDefaultOptions } from "../queryDefaults.js";

test("queryDefaultOptions keeps control data fresh without aggressive polling", () => {
  assert.equal(queryDefaultOptions.queries.staleTime, 20_000);
  assert.equal(queryDefaultOptions.queries.refetchOnWindowFocus, true);
  assert.equal(queryDefaultOptions.queries.retry, 1);
});

test("queryDefaultOptions never retries mutations implicitly", () => {
  assert.equal(queryDefaultOptions.mutations.retry, false);
});
