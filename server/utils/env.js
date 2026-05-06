const DEFAULT_PORT = 3000;

function parsePort(rawPort) {
  const parsed = Number.parseInt(rawPort, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
}

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parsePort(process.env.PORT)
});

module.exports = {
  env
};
