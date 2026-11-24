import path from "node:path";
import { checkRepository } from "./check-css-variable-layering.mjs";

export default {
  meta: { name: "blocknote" },
  rules: {
    "css-variable-layering": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Enforce BlockNote theme variable and element variable layering",
        },
        schema: [],
      },
      create(context) {
        const root = context.cwd;
        // Oxlint cannot dispatch CSS files to JS plugins. Audit the repository
        // from one stable host, including CSS-only changes in the staged hook.
        if (
          path.resolve(context.filename) !== path.join(root, "vite.config.ts")
        ) {
          return {};
        }
        return {
          Program() {
            for (const diagnostic of checkRepository(root)) {
              context.report({
                loc: {
                  start: { line: 1, column: 0 },
                  end: { line: 1, column: 1 },
                },
                message: `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}: ${diagnostic.message}`,
              });
            }
          },
        };
      },
    },
  },
};
