import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".source/**",
    "components/fumadocs/**",
    "components/example/generated/**", // TODO: fix lint of examples
  ]),
]);

export default eslintConfig;
