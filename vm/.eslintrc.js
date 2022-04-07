module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "semi": ["error", "always", { "omitLastInOneLineBlock": true }],
    "quotes": ["error", "double"],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  }
};
