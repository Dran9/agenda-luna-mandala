const { Router } = require("express");

const healthRoute = Router();

healthRoute.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "agenda-luna-mandala",
    phase: "fase-0",
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  healthRoute
};
