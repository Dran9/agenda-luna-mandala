const express = require("express");
const path = require("node:path");

const { adminRoute } = require("./routes/admin.route");
const { healthRoute } = require("./routes/health.route");
const { publicBookingRoute } = require("./routes/publicBooking.route");

const bookingDistDir = path.resolve(__dirname, "../apps/booking/dist");
const adminDistDir = path.resolve(__dirname, "../apps/admin/dist");

const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
const HTML_CACHE_CONTROL = "no-cache";

function setStaticCacheHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") {
    res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
    return;
  }

  const isUnderHashedAssetsDir = /[\\/]assets[\\/]/.test(filePath);
  const looksHashed = /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(filePath);

  if (isUnderHashedAssetsDir || looksHashed) {
    res.setHeader("Cache-Control", HASHED_ASSET_CACHE_CONTROL);
  }
}

const staticOptions = { setHeaders: setStaticCacheHeaders };

function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/health", healthRoute);
  app.use("/api/admin", adminRoute);
  app.use("/api/public/booking", publicBookingRoute);

  app.use("/admin", express.static(adminDistDir, staticOptions));
  app.get(["/admin", "/admin/{*splat}"], (_req, res) => {
    res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
    res.sendFile(path.join(adminDistDir, "index.html"));
  });

  app.use(express.static(bookingDistDir, staticOptions));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api" || req.path.startsWith("/admin")) {
      return next();
    }

    res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
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
  createApp
};
