module.exports = {
  root: true,
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "@raycast",
  ],
  rules: {
    "@raycast/prefer-title-case": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      },
    ],
  },
};
