import pkg from "./package.json";

export default {
  input: "out/public_api.js",
  output: [
    {
      format: "umd",
      file: "dist/umd/index.js",
      name: "MqttClient"
    },
    {
      format: "iife",
      file: "dist/iife/index.js",
      name: "MqttClient"
    }
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]
};
