const typeScriptExtensions = [".ts", ".cts", ".mts", ".tsx"];

const allExtensions = [...typeScriptExtensions, ".js", ".jsx"];

module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "react-app",
    "react-app/jest",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["import", "@typescript-eslint"],
  settings: {
    "import/extensions": allExtensions,
    "import/external-module-folders": ["node_modules", "node_modules/@types"],
    "import/parsers": {
      "@typescript-eslint/parser": typeScriptExtensions,
    },
    "import/resolver": {
      node: {
        extensions: allExtensions,
      },
    },
  },
  ignorePatterns: ["**/ui/*"],
  rules: {
    "no-console": "error",
    curly: 1,
    "import/extensions": ["error", "always", { ignorePackages: true }],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
        peerDependencies: true,
        optionalDependencies: false,
        bundledDependencies: false,
      },
    ],
    // would be nice to enable these rules later, but they are too noisy right now
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "import/no-cycle": "error",
    // doesn't work:
    // "import/no-restricted-paths": [
    //   "error",
    //   {
    //     zones: [
    //       {
    //         target: "./src/**/*",
    //         from: "./types/**/*",
    //         message: "Import from this module to types is not allowed.",
    //       },
    //     ],
    //   },
    // ],
  },
};
