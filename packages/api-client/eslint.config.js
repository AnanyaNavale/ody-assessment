import rootConfig from "../../eslint.config.js";

/** Package override: spread the shared root config and add api-client rules here. */
export default [
  ...rootConfig,
];
