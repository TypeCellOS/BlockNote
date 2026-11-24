// Content from outside the editor (a paste, a drop, an HTML or markdown
// string) can load a resource and run an event handler in the active
// document. The code handles it only in `detachedDoc()`
// (packages/core/src/util/detachedDoc.ts). This rule has three checks:
//
// | Where                                    | Not allowed                         |
// | ---------------------------------------- | ----------------------------------- |
// | 1. each file                             | `.cloneNode`, `.createHTMLDocument` |
// | 2. a file that only handles such content | global `document`, `.ownerDocument` |
// | 3. a parse function, in each file        | global `document`, `.ownerDocument` |
//
// Check 2 cannot be for each file: render code makes its elements in the
// active document on purpose, and a block has its parse functions next to its
// render code. Check 3 is for those parse functions.
//
// A correct use has an exception on the line before it:
// `// oxlint-disable-next-line blocknote-dom/no-active-document -- <reason>`.
const message =
  "Content from outside the editor stays in `detachedDoc()` (packages/core/src/util/detachedDoc.ts): make an element with `detachedDoc().createElement(...)` and copy a node with `detachedDoc().importNode(node, true)`.";

// Check 2: the files of packages/core/src that only handle content from
// outside the editor.
const outsideContentFiles = [
  /^api\/parsers\//,
  /^api\/clipboard\/fromClipboard\//,
  /^api\/exporters\/markdown\//,
  /^blocks\/(.+\/)?helpers\/parse\//,
  /^blocks\/getDetailsContent\.ts$/,
  /^blocks\/ListItem\/getListItemContent\.ts$/,
];

// Check 3: a parse function is a function with a name that starts with `parse`
// or contains `Parse` (`parse`, `parseHTML`, `imageParse`, `getParseRules`,
// `blockContentParser`). The name is the name of the function, or the name of
// the property, the method or the variable that holds it. The check includes
// the functions in a parse function, for example the `getAttrs` and the
// `getContent` of a ProseMirror parse rule.
const parseName = /(^p|P)arse/;
const functions = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);
const wrappers = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
]);

function staticName(name, computed) {
  if (name.type === "Literal") {
    return String(name.value);
  }
  return computed ? undefined : name.name;
}

function functionName(node) {
  if (node.id) {
    return node.id.name;
  }
  let value = node;
  let holder = node.parent;
  while (wrappers.has(holder.type)) {
    value = holder;
    holder = holder.parent;
  }
  if (
    (holder.type === "Property" ||
      holder.type === "MethodDefinition" ||
      holder.type === "PropertyDefinition") &&
    holder.value === value
  ) {
    return staticName(holder.key, holder.computed);
  }
  if (
    holder.type === "VariableDeclarator" &&
    holder.init === value &&
    holder.id.type === "Identifier"
  ) {
    return holder.id.name;
  }
  return undefined;
}

function inParseFunction(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      functions.has(parent.type) &&
      parseName.test(functionName(parent) ?? "")
    ) {
      return true;
    }
  }
  return false;
}

const noActiveDocument = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const file =
      context.filename.replaceAll("\\", "/").split("/packages/core/src/")[1] ??
      "";
    const wholeFile = outsideContentFiles.some((pattern) => pattern.test(file));
    const found = [];
    // Checks 2 and 3.
    function activeDocument(node) {
      if (wholeFile || inParseFunction(node)) {
        found.push(node);
      }
    }
    function property(name, computed) {
      switch (staticName(name, computed)) {
        case "cloneNode":
        case "createHTMLDocument":
          found.push(name);
          break;
        case "ownerDocument":
          activeDocument(name);
          break;
      }
    }
    return {
      // The references to the global `document`, found as ESLint's
      // `no-restricted-globals` finds them: a property or a local variable
      // with this name is not one.
      Program(program) {
        const scope = context.sourceCode.getScope(program);
        const references = new Set(scope.through);
        for (const variable of scope.variables) {
          if (variable.defs.length === 0) {
            variable.references.forEach((reference) =>
              references.add(reference),
            );
          }
        }
        for (const { identifier } of references) {
          if (identifier.name === "document") {
            activeDocument(identifier);
          }
        }
      },
      MemberExpression(node) {
        property(node.property, node.computed);
      },
      // `const { ownerDocument } = node`
      Property(node) {
        if (node.parent.type === "ObjectPattern") {
          property(node.key, node.computed);
        }
      },
      // A line gives one finding, for the first name on it.
      "Program:exit"() {
        const lines = new Set();
        for (const node of found.sort((a, b) => a.range[0] - b.range[0])) {
          const { line } = node.loc.start;
          if (!lines.has(line)) {
            lines.add(line);
            context.report({ node, message });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "blocknote-dom" },
  rules: { "no-active-document": noActiveDocument },
};
