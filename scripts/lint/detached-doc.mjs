// Content from outside the editor (a paste, a drop, an HTML or markdown
// string) can load a resource and run an event handler in the active
// document. The code handles it only in `detachedDoc()`
// (packages/core/src/util/detachedDoc.ts). This rule flags `.cloneNode` and
// `.createHTMLDocument` throughout core.
//
// A correct use has an exception on the line before it:
// `// oxlint-disable-next-line blocknote-dom/no-active-document -- <reason>`.
const message =
  "Content from outside the editor stays in `detachedDoc()` (packages/core/src/util/detachedDoc.ts): make an element with `detachedDoc().createElement(...)` and copy a node with `detachedDoc().importNode(node, true)`.";

function staticName(name, computed) {
  if (name.type === "Literal") {
    return String(name.value);
  }
  return computed ? undefined : name.name;
}

const noActiveDocument = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const found = [];
    function property(name, computed) {
      const method = staticName(name, computed);
      if (method === "cloneNode" || method === "createHTMLDocument") {
        found.push(name);
      }
    }
    return {
      MemberExpression(node) {
        property(node.property, node.computed);
      },
      // `const { cloneNode } = node`
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

const noRealmDependentDOMInstanceof = {
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      'BinaryExpression[operator="instanceof"]'(node) {
        const constructor = node.right;
        let name;
        if (constructor.type === "Identifier") {
          name = constructor.name;
        } else if (
          constructor.type === "MemberExpression" &&
          constructor.object.type === "Identifier" &&
          ["globalThis", "window", "self"].includes(constructor.object.name)
        ) {
          name = staticName(constructor.property, constructor.computed);
        }

        if (name === "Node" || name === "HTMLElement") {
          context.report({
            node,
            message:
              "DOM constructors are realm-specific. Use isDOMNode, isDOMElement, or isDOMHTMLElement from @blocknote/core, depending on the DOM APIs you need.",
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "blocknote-dom" },
  rules: {
    "no-active-document": noActiveDocument,
    "no-realm-dependent-dom-instanceof": noRealmDependentDOMInstanceof,
  },
};
