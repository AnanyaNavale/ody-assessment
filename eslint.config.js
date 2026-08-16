import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared root ESLint flat config.
 * Workspace packages can import this file and spread/override as needed.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.wrangler/**",
      "**/.expo/**",
      "**/.expo-shared/**",
      "**/web-build/**",
      "**/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {},
  },
);
