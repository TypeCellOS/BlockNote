// An oxlint JS plugin with the rules of the text lens (packages/xl-ai/src/api/v2).
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** For each folder: for each file of the folder, the names that the index.ts of the folder re-exports from it. */
const apiCache = new Map();

/** The names that the `index.ts` of the folder of `file` re-exports from `file`. */
function apiNames(file) {
  const folder = dirname(file);
  let byFile = apiCache.get(folder);
  if (byFile === undefined) {
    byFile = new Map();
    const index = join(folder, "index.ts");
    if (existsSync(index)) {
      const text = readFileSync(index, "utf8");
      const reExports = text.matchAll(
        /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']\.\/([^"']+)\.js["']/g,
      );
      for (const [, list, from] of reExports) {
        const names = byFile.get(from) ?? new Set();
        for (const item of list.split(",")) {
          // `name`, `type name` or `name as other`: the name of the file.
          const name = item
            .trim()
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0]
            .trim();
          if (name !== "") {
            names.add(name);
          }
        }
        byFile.set(from, names);
      }
    }
    apiCache.set(folder, byFile);
  }
  return byFile.get(basename(file).replace(/\.ts$/, "")) ?? new Set();
}

/** The names that an export statement declares (`export function a`, `export const a = …`, `export { a, b }`). */
function exportedNames(node) {
  const declaration = node.declaration;
  if (declaration === null || declaration === undefined) {
    return node.source
      ? []
      : node.specifiers.map((s) => s.local.name ?? s.local.value);
  }
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((d) =>
      d.id.type === "Identifier" ? [d.id.name] : [],
    );
  }
  return declaration.id ? [declaration.id.name] : [];
}

/** True if the doc comment directly before the export statement has the tag `@internal`. */
function hasInternalTag(context, node) {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const comments = sourceCode.getCommentsBefore(node);
  const doc = [...comments]
    .reverse()
    .find(
      (comment) => comment.type === "Block" && comment.value.startsWith("*"),
    );
  return doc !== undefined && /(^|\s)@internal\b/.test(doc.value);
}

const folderApi = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "An export of a file is in the index.ts of its folder (the API of the folder), or it has @internal in its doc comment, never both.",
    },
    schema: [],
  },
  create(context) {
    const file = context.filename ?? context.getFilename();
    if (basename(file) === "index.ts") {
      return {};
    }
    return {
      ExportNamedDeclaration(node) {
        const api = apiNames(file);
        const internal = hasInternalTag(context, node);
        for (const name of exportedNames(node)) {
          if (api.has(name) && internal) {
            context.report({
              node,
              message: `"${name}" is in the index.ts of its folder (the API of the folder). Remove @internal from its doc comment.`,
            });
          } else if (!api.has(name) && !internal) {
            context.report({
              node,
              message: `"${name}" is not in the index.ts of its folder. Add @internal to its doc comment (for tests or for the other files of the folder), or export it from index.ts.`,
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "lens" },
  rules: { "folder-api": folderApi },
};
