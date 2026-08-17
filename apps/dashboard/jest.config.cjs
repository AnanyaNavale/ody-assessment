/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  moduleNameMapper: {
    "^@ody/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@ody/api-client$": "<rootDir>/../../packages/api-client/src/index.ts",
    "^@ody/types$": "<rootDir>/../../packages/types/src/index.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@ody))",
  ],
};
