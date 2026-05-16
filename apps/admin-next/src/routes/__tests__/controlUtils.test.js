import assert from "node:assert/strict";
import test from "node:test";

import {
  adminSessionLabel,
  appointmentsForControl,
  centerSlugForControl,
  formatUpdatedAt,
  refreshLabel,
  todayKey
} from "../controlUtils.js";

test("todayKey returns an ISO date key", () => {
  assert.equal(todayKey(new Date("2026-05-18T18:30:00.000Z")), "2026-05-18");
});

test("formatUpdatedAt renders the last successful query time", () => {
  assert.match(formatUpdatedAt(Date.parse("2026-05-18T18:30:00.000Z")), /^Datos actualizados /);
});

test("formatUpdatedAt handles missing query data", () => {
  assert.equal(formatUpdatedAt(0), "Sin actualizar");
});

test("refreshLabel shows background refresh without hiding cached data", () => {
  assert.equal(
    refreshLabel({ isFetching: true, isLoading: false, dataUpdatedAt: 123 }),
    "Actualizando"
  );
});

test("refreshLabel shows last updated time outside background refresh", () => {
  assert.match(
    refreshLabel({ isFetching: false, isLoading: false, dataUpdatedAt: Date.now() }),
    /^Datos actualizados /
  );
});

test("appointmentsForControl reads the dense table rows from the backend payload", () => {
  const today = [{ id: "appointment-1" }];

  assert.deepEqual(appointmentsForControl({ today }), today);
  assert.deepEqual(appointmentsForControl(null), []);
});

test("centerSlugForControl reads tenant slug from the backend payload", () => {
  assert.equal(centerSlugForControl({ center: { slug: "daniel" } }), "daniel");
  assert.equal(centerSlugForControl({}), "");
});

test("adminSessionLabel prefers full name and falls back to email", () => {
  assert.equal(adminSessionLabel({ fullName: "Daniel", email: "daniel@example.com" }), "Daniel");
  assert.equal(adminSessionLabel({ fullName: "", email: "daniel@example.com" }), "daniel@example.com");
  assert.equal(adminSessionLabel(null), "");
});
