import pkg from "./package.json";

const glob = require("glob");

const all = glob.sync("out/**/*.js");
// const filenames = glob.sync("out/*.js");
// const utils = glob.sync("out/utils/*.js");

export default {
  input: all, //[...filenames, ...utils],
  experimentalCodeSplitting: true,
  output: [
    {
      //   file: pkg.main,
      format: "cjs",
      dir: "dist/cjs"
      // file: "dist/cjs/public_api.js"
    },
    // {
    //   //   file: pkg.module,
    //   format: "esm",
    //   dir: "dist/esm"
    //   // file: "dist/esm/public_api.js"
    // }
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]
};
