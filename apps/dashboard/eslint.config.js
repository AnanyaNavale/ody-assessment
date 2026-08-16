import rootConfig from "../../eslint.config.js";

/** Package override: spread the shared root config and add dashboard-specific rules here. */
export default [
  ...rootConfig,
];
