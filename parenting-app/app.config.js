// Adds an optional web base path on top of app.json, e.g. EXPO_BASE_URL=/parents when the
// web build is hosted under a sub-path of another site. Native builds ignore it.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
