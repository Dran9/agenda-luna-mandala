import assert from "node:assert/strict";
import test from "node:test";

import { resourcesKey } from "../queryKeys.js";

test("resourcesKey reuses the shared resources cache", () => {
  assert.deepEqual(resourcesKey(), ["resources"]);
});
