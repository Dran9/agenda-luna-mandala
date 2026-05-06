const { createApp } = require("./createApp");
const { env } = require("./utils/env");

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Agenda Luna Mandala running on port ${env.PORT}`);
});
