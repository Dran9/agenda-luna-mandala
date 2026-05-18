const express = require("express");
const path = require("node:path");

const { adminRoute } = require("./routes/admin.route");
const { healthRoute } = require("./routes/health.route");
const { publicBookingRoute } = require("./routes/publicBooking.route");
const { env } = require("./utils/env");

const bookingDistDir = path.resolve(__dirname, "../apps/booking/dist");
const adminDistDir = path.resolve(__dirname, "../apps/admin/dist");
const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Authorization, Content-Type, Idempotency-Key";

function setStaticCacheHeaders(res, filePath) {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader("Cache-Control", HASHED_ASSET_CACHE_CONTROL);
  }
}

function parseAllowedOrigins(rawOrigins) {
  return String(rawOrigins || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== "*");
}

function appendVaryOrigin(res) {
  const current = String(res.getHeader("Vary") || "").trim();

  if (!current) {
    res.setHeader("Vary", "Origin");
    return;
  }

  const values = current.split(",").map((value) => value.trim().toLowerCase());

  if (!values.includes("origin")) {
    res.setHeader("Vary", `${current}, Origin`);
  }
}

function createCorsMiddleware({ allowedOrigins = parseAllowedOrigins(env.API_CORS_ORIGINS) } = {}) {
  const allowed = new Set(allowedOrigins);

  return function corsMiddleware(req, res, next) {
    const origin = String(req.headers.origin || "").trim();
    const isAllowedOrigin = origin && allowed.has(origin);

    if (isAllowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", CORS_METHODS);
      res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS);
      res.setHeader("Access-Control-Max-Age", "600");
      appendVaryOrigin(res);
    }

    if (req.method === "OPTIONS" && origin) {
      res.status(isAllowedOrigin ? 204 : 403).end();
      return;
    }

    next();
  };
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(createCorsMiddleware());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/health", healthRoute);
  app.use("/api/admin", adminRoute);
  app.use("/api/public/booking", publicBookingRoute);

  app.use("/admin", express.static(adminDistDir, { setHeaders: setStaticCacheHeaders }));
  app.get(["/admin", "/admin/{*splat}"], (_req, res) => {
    res.sendFile(path.join(adminDistDir, "index.html"));
  });

  app.use(express.static(bookingDistDir, { setHeaders: setStaticCacheHeaders }));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api" || req.path.startsWith("/admin")) {
      return next();
    }

    res.sendFile(path.join(bookingDistDir, "index.html"));
  });

  app.use((req, res) => {
    res.status(404).json({
      status: "not_found",
      path: req.path
    });
  });

  return app;
}

module.exports = {
  createApp,
  createCorsMiddleware,
  parseAllowedOrigins
};
