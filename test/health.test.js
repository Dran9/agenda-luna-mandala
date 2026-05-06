const assert = require("node:assert/strict");
const test = require("node:test");

const { createApp } = require("../server/createApp");
const { healthRoute } = require("../server/routes/health.route");

function createResponseMock() {
  return {
    statusCode: undefined,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test("createApp returns an express app", () => {
  const app = createApp();
  assert.equal(typeof app, "function");
});

test("GET /api/health returns phase-0 health payload", () => {
  const layer = healthRoute.stack.find((entry) => entry.route && entry.route.path === "/");
  const handler = layer.route.stack[0].handle;
  const res = createResponseMock();

  handler({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "ok");
  assert.equal(res.payload.service, "agenda-luna-mandala");
  assert.equal(res.payload.phase, "fase-0");
  assert.equal(typeof res.payload.timestamp, "string");
});
