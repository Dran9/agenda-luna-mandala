const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  root: __dirname,
  base: "/admin/",
  plugins: [react()],
  server: {
    port: 5175
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
