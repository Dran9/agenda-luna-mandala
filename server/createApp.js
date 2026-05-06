const express = require("express");
const path = require("node:path");

const { healthRoute } = require("./routes/health.route");

const bookingDistDir = path.resolve(__dirname, "../apps/booking/dist");
const adminDistDir = path.resolve(__dirname, "../apps/admin/dist");

function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api/health", healthRoute);

  app.use("/admin", express.static(adminDistDir));
  app.get(["/admin", "/admin/{*splat}"], (_req, res) => {
    res.sendFile(path.join(adminDistDir, "index.html"));
  });

  app.use(express.static(bookingDistDir));
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
  createApp
};
