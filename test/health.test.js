const assert = require("node:assert/strict");
const test = require("node:test");

const { createApp, createCorsMiddleware, parseAllowedOrigins } = require("../server/createApp");
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

function createHeaderResponseMock() {
  return {
    headers: {},
    statusCode: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      this.ended = true;
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

test("parseAllowedOrigins ignores wildcard and empty values", () => {
  assert.deepEqual(parseAllowedOrigins("https://admin.example.com, *, ,https://agenda.example.com"), [
    "https://admin.example.com",
    "https://agenda.example.com"
  ]);
});

test("CORS middleware allows configured origin and handles preflight", () => {
  const middleware = createCorsMiddleware({
    allowedOrigins: ["https://admin.example.com"]
  });
  const req = {
    method: "OPTIONS",
    headers: {
      origin: "https://admin.example.com"
    }
  };
  const res = createHeaderResponseMock();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(nextCalled, false);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://admin.example.com");
  assert.equal(res.headers.Vary, "Origin");
});

test("CORS middleware rejects unconfigured preflight origin", () => {
  const middleware = createCorsMiddleware({
    allowedOrigins: ["https://admin.example.com"]
  });
  const req = {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example.com"
    }
  };
  const res = createHeaderResponseMock();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.ended, true);
  assert.equal(nextCalled, false);
  assert.equal(res.headers["Access-Control-Allow-Origin"], undefined);
});
