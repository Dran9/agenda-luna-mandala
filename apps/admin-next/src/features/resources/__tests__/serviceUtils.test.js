import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateServicePayload,
  buildUpdateServicePayload,
  filterServices,
  servicesForSettings,
  serviceSummary
} from "../serviceUtils.js";

const payload = {
  settings: {
    services: [
      { id: 1, name: "Masaje", status: "ACTIVE" },
      { id: 2, name: "Reiki", status: "INACTIVE" }
    ]
  }
};

test("servicesForSettings reads services from resources settings payload", () => {
  assert.deepEqual(servicesForSettings(payload), payload.settings.services);
  assert.deepEqual(servicesForSettings({}), []);
});

test("serviceSummary counts total and active services", () => {
  assert.deepEqual(serviceSummary(payload), {
    total: 2,
    active: 1
  });
});

test("filterServices applies a compact local query", () => {
  assert.deepEqual(
    filterServices([
      { id: 1, name: "Masaje", requiredFeaturesLabel: "Camilla" },
      { id: 2, name: "Reiki", requiredFeaturesLabel: "Solo sillas" }
    ], "cami"),
    [{ id: 1, name: "Masaje", requiredFeaturesLabel: "Camilla" }]
  );
});

test("buildCreateServicePayload maps checkbox fields to requiredFeatureKeys", () => {
  assert.deepEqual(
    buildCreateServicePayload({
      name: " Masaje ",
      durationMinutes: "60",
      priceAmount: "120.5",
      camilla: "on",
      mesa: undefined
    }),
    {
      name: "Masaje",
      durationMinutes: 60,
      priceAmount: 120.5,
      requiredFeatureKeys: ["camilla"]
    }
  );
});

test("buildUpdateServicePayload maps active status to boolean", () => {
  assert.deepEqual(
    buildUpdateServicePayload({
      name: "Masaje",
      durationMinutes: "75",
      priceAmount: "",
      isActive: "false"
    }),
    {
      name: "Masaje",
      durationMinutes: 75,
      priceAmount: 0,
      requiredFeatureKeys: [],
      isActive: false
    }
  );
});
