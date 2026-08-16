import rootConfig from "../../eslint.config.js";

/** Package override: spread the shared root config and add backend-specific rules here. */
export default [
  ...rootConfig,
];
