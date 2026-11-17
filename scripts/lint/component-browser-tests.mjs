import { basename } from "node:path";

const groups = ["unit", "integration", "keyboard", "a11y"];
const testModules = new Set(["vite-plus/test", "vitest"]);
const apis = new Set(["describe", "suite", "it", "test"]);
const modifiers = new Set([
  "each",
  "for",
  "skip",
  "only",
  "todo",
  "fails",
  "concurrent",
  "sequential",
  "shuffle",
  "skipIf",
  "runIf",
]);

function propertyName(node) {
  return node.computed ? node.property.value : node.property.name;
}

// Resolve bindings, not spelling: aliases work and locally shadowed names don't
// become test declarations. Unresolved names are Vitest's configured globals.
function importedName(identifier, context) {
  let scope = context.sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) {
      const definition = variable.defs[0];
      if (!definition) {
        return identifier.name;
      }
      if (
        definition.type !== "ImportBinding" ||
        !testModules.has(definition.parent.source.value)
      ) {
        return undefined;
      }
      return definition.node.type === "ImportNamespaceSpecifier"
        ? "namespace"
        : (definition.node.imported?.name ?? definition.node.imported?.value);
    }
    scope = scope.upper;
  }
  return identifier.name;
}

function testApi(callee, context) {
  if (callee.type === "Identifier") {
    const name = importedName(callee, context);
    return apis.has(name) ? name : undefined;
  }
  if (callee.type === "CallExpression") {
    return testApi(callee.callee, context);
  }
  if (callee.type === "MemberExpression") {
    if (
      callee.object.type === "Identifier" &&
      importedName(callee.object, context) === "namespace"
    ) {
      const name = propertyName(callee);
      return apis.has(name) ? name : undefined;
    }
    // test.extend(), test.scoped(), etc. create fixtures; they do not register
    // tests. Unknown/dynamic APIs are deliberately not guessed from spelling.
    return modifiers.has(propertyName(callee))
      ? testApi(callee.object, context)
      : undefined;
  }
  return undefined;
}

function staticTitle(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

function directStatement(call, body) {
  return (
    call.parent.type === "ExpressionStatement" && call.parent.parent === body
  );
}

const structure = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      owner: 'Use exactly one top-level describe("{{owner}}", () => { ... }).',
      callback: "Use an inline describe callback with a block body.",
      group:
        "Place each applicable group directly inside the owner, once, in this order: unit, integration, keyboard, a11y. Omit inapplicable groups.",
      placement:
        "Place tests inside an applicable group, not directly in the owner or at file scope.",
      empty: "Omit empty describe groups; hooks or comments are not tests.",
    },
  },
  create(context) {
    const filename = basename(context.filename);
    if (!/\.browser\.test\.[cm]?[jt]sx?$/.test(filename)) {
      return {};
    }
    // File owner, not imported symbol: NestBlockButtons deliberately owns both
    // NestBlockButton and UnnestBlockButton. Controllers retain their full name.
    const owner = filename.replace(/\.browser\.test\.[cm]?[jt]sx?$/, "");
    const suites = [];
    const tests = [];

    return {
      CallExpression(node) {
        // Only the final registration, not the factory in it.each(cases)(...).
        if (
          (node.parent.type === "CallExpression" &&
            node.parent.callee === node) ||
          (node.parent.type === "MemberExpression" &&
            node.parent.object === node)
        ) {
          return;
        }
        const api = testApi(node.callee, context);
        if (!api) {
          return;
        }
        if (api === "describe" || api === "suite") {
          const callback = node.arguments.at(-1);
          const body =
            (callback?.type === "ArrowFunctionExpression" ||
              callback?.type === "FunctionExpression") &&
            callback.body.type === "BlockStatement"
              ? callback.body
              : undefined;
          suites.push({ node, body, title: staticTitle(node.arguments[0]) });
          if (!body) {
            context.report({ node, messageId: "callback" });
          }
        } else {
          tests.push(node);
        }
      },
      "Program:exit"(program) {
        const roots = suites.filter(({ node }) =>
          directStatement(node, program),
        );
        if (roots.length !== 1 || roots[0].title !== owner) {
          context.report({
            node: program,
            messageId: "owner",
            data: { owner },
          });
          return;
        }
        const root = roots[0];
        if (!root.body) {
          return;
        }
        const categories = suites.filter(({ node }) =>
          directStatement(node, root.body),
        );
        let previous = -1;
        for (const category of categories) {
          const index = groups.indexOf(category.title);
          if (index < 0 || index <= previous) {
            context.report({ node: category.node, messageId: "group" });
          }
          previous = Math.max(previous, index);
        }
        function inside(node, body) {
          for (let parent = node.parent; parent; parent = parent.parent) {
            if (parent === body) {
              return true;
            }
          }
          return false;
        }
        for (const node of tests) {
          if (!categories.some(({ body }) => body && inside(node, body))) {
            context.report({ node, messageId: "placement" });
          }
        }
        for (const suite of suites) {
          if (suite === root || !suite.body) {
            continue;
          }
          if (!inside(suite.node, root.body)) {
            context.report({ node: suite.node, messageId: "group" });
          }
          if (!tests.some((node) => inside(node, suite.body))) {
            context.report({ node: suite.node, messageId: "empty" });
          }
        }
        if (categories.length === 0) {
          context.report({ node: root.node, messageId: "group" });
        }
      },
    };
  },
};

export default {
  meta: { name: "blocknote-tests" },
  rules: { "component-browser-structure": structure },
};
