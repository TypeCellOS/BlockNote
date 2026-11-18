import { parseSync } from "vite-plus";
import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const themeFile = "packages/react/src/editor/theme.css";
export const typesFile = "packages/mantine/src/Theme.ts";

function parseScript(source, file) {
  const result = parseSync(file, source);
  if (result.errors.length) {
    throw new SyntaxError(
      `Cannot parse ${file}: ${result.errors.map((error) => error.message).join("; ")}`,
    );
  }
  return result.program;
}

function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-z])([0-9])/g, "$1-$2")
    .toLowerCase();
}

function walk(node, visit, parent) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (typeof node.type === "string") {
    visit(node, parent);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, visit, node));
    } else if (value && typeof value === "object") {
      walk(value, visit, node);
    }
  }
}

// Read the public Theme contract, using the same key conversion as
// BlockNoteTheme.applyVariables. Never infer a layer from a variable's spelling.
export function discoverVariables(source) {
  const ast = parseScript(source, typesFile);
  const layers = { theme: new Set(), elements: new Set() };
  function collect(node, prefix, target, root = false) {
    if (node.type === "TSTypeReference" && node.typeName.name === "Partial") {
      collect(node.typeArguments.params[0], prefix, target, root);
    } else if (node.type === "TSTypeLiteral") {
      for (const member of node.members) {
        if (member.type !== "TSPropertySignature" || member.computed) {
          throw new Error(
            "Theme variable discovery requires explicit property signatures",
          );
        }
        const name = member.key.name ?? member.key.value;
        if (root && name === "elements") {
          collect(
            member.typeAnnotation.typeAnnotation,
            "--bn",
            layers.elements,
          );
        } else {
          collect(
            member.typeAnnotation.typeAnnotation,
            `${prefix}-${kebab(name)}`,
            target,
          );
        }
      }
    } else if (node.type === "TSStringKeyword") {
      target.add(prefix);
    } else {
      throw new Error(`Unsupported theme variable type: ${node.type}`);
    }
  }
  walk(ast, (node) => {
    if (node.type !== "TSTypeAliasDeclaration") {
      return;
    }
    if (node.id.name === "Theme") {
      collect(node.typeAnnotation, "--bn", layers.theme, true);
    }
  });
  if (!layers.theme.size || !layers.elements.size) {
    throw new Error(
      "Missing Theme variables or Theme.elements definitions; variable enforcement cannot run",
    );
  }
  for (const variable of layers.theme) {
    if (layers.elements.has(variable)) {
      throw new Error(`Variable belongs to both layers: ${variable}`);
    }
  }
  return layers;
}

function decodeCSS(name) {
  return name.replace(/\\([0-9a-f]{1,6}\s?|[^\r\n\f])/gi, (_, escape) => {
    if (/^[0-9a-f]/i.test(escape)) {
      const code = Number.parseInt(escape.trim(), 16);
      return code === 0 || code > 0x10ffff
        ? "\ufffd"
        : String.fromCodePoint(code);
    }
    return escape;
  });
}

function references(value, variables) {
  const found = [];
  valueParser(value).walk((node) => {
    if (
      node.type !== "function" ||
      decodeCSS(node.value).toLowerCase() !== "var"
    ) {
      return;
    }
    const first = node.nodes.find(
      (child) => child.type !== "space" && child.type !== "comment",
    );
    const end = node.nodes.findIndex(
      (child) => child.type === "div" && child.value === ",",
    );
    const argument = node.nodes
      .slice(0, end < 0 ? undefined : end)
      .filter((child) => child.type !== "comment");
    const variable = decodeCSS(valueParser.stringify(argument).trim());
    if (first?.type === "word" && variables.theme.has(variable)) {
      found.push({ variable, offset: first.sourceIndex });
    }
  });
  return found;
}

function diagnostic(file, source, offset, variable) {
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  return {
    file,
    line,
    column,
    variable,
    message: `${variable} is a theme variable; component styling must use or define an appropriate element variable. Theme variable references are only allowed in recognized variable declarations in approved theme contexts.`,
  };
}

export function checkCSS(source, file, variables) {
  const errors = [];
  const root = postcss.parse(source, { from: file });
  root.walkDecls((decl) => {
    const property = decodeCSS(decl.prop);
    // Theme variable declarations may override the overall theme.
    // Element style mappings are authorized only in explicit root theme rules.
    const themeContext =
      file === themeFile &&
      decl.parent.type === "rule" &&
      [
        ".bn-root",
        '.bn-root[data-color-scheme="dark"]',
        '.bn-root[data-color-scheme="light"]',
      ].includes(decl.parent.selector);
    if (
      variables.theme.has(property) ||
      (themeContext && variables.elements.has(property))
    ) {
      return;
    }
    const valueOffset =
      decl.source.start.offset + decl.prop.length + decl.raws.between.length;
    for (const ref of references(
      decl.raws.value?.raw ?? decl.value,
      variables,
    )) {
      errors.push(
        diagnostic(file, source, valueOffset + ref.offset, ref.variable),
      );
    }
  });
  return errors;
}

export function checkScript(source, file, variables) {
  const ast = parseScript(source, file);
  const errors = [];
  // Inspect static string leaves, irrespective of the styling API. This covers
  // style objects, JSX attributes, setProperty, CSS templates and helper calls.
  // No data flow is needed when the string is assigned to an alias first.
  walk(ast, (node, parent) => {
    if (parent?.type === "Property") {
      if (parent.key === node) {
        return;
      }
      const property = parent.key.name ?? parent.key.value;
      if (variables.theme.has(property)) {
        return;
      }
    }
    if (
      parent?.type === "CallExpression" &&
      parent.callee.type === "MemberExpression" &&
      parent.callee.property.name === "setProperty" &&
      parent.arguments[1] === node &&
      variables.theme.has(parent.arguments[0]?.value)
    ) {
      return;
    }
    let value;
    if (node.type === "Literal" && typeof node.value === "string") {
      value = node.value;
    } else if (node.type === "TemplateElement") {
      value = node.value.cooked ?? node.value.raw;
    } else {
      return;
    }
    for (const ref of references(value, variables)) {
      // Oxc decodes JS escapes. Locate the spelling in the raw source when
      // possible; otherwise point at the literal containing the escaped variable.
      const raw = source.slice(node.start, node.end);
      const quoteOffset = 1;
      const rawValue = raw.slice(
        1,
        node.type === "TemplateElement" && !node.tail ? -2 : -1,
      );
      const rawOffset =
        rawValue === value
          ? ref.offset + quoteOffset
          : raw.indexOf(ref.variable, quoteOffset);
      errors.push(
        diagnostic(
          file,
          source,
          node.start + Math.max(0, rawOffset),
          ref.variable,
        ),
      );
    }
  });
  return errors;
}

const excludedDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  "types",
  "coverage",
  "__snapshots__",
  "snapshots",
  "__tests__",
  "__fixtures__",
  "fixtures",
  "test",
  "tests",
  "docs",
  ".next",
]);
export function isSourceFile(file) {
  return (
    /\.(css|[cm]?[jt]sx?)$/.test(file) &&
    !/\.(test|spec|stories|d)\.[^.]+$/.test(file) &&
    !/\.generated\./.test(file) &&
    !file
      .split("/")
      .some(
        (part) => excludedDirectories.has(part) || part.endsWith("-snapshots"),
      )
  );
}

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      excludedDirectories.has(entry.name) ||
      entry.name.endsWith("-snapshots")
    ) {
      continue;
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(file));
    } else if (isSourceFile(file)) {
      files.push(file);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

export function checkRepository(root) {
  const variables = discoverVariables(
    readFileSync(path.join(root, typesFile), "utf8"),
  );
  // Fail closed if the types exist but the production defaults have not landed.
  const theme = postcss.parse(readFileSync(path.join(root, themeFile), "utf8"));
  const declared = new Set();
  theme.walkDecls((decl) => declared.add(decl.prop));
  const diagnostics = [];
  for (const variable of [...variables.theme, ...variables.elements]) {
    if (!declared.has(variable)) {
      diagnostics.push({
        file: themeFile,
        line: 1,
        column: 1,
        variable,
        message: `Canonical theme.css is missing ${variable}; integrate the public variable default before enforcement can pass.`,
      });
    }
  }
  for (const absolute of sourceFiles(path.join(root, "packages"))) {
    const file = path.relative(root, absolute).split(path.sep).join("/");
    const source = readFileSync(absolute, "utf8");
    diagnostics.push(
      ...(file.endsWith(".css") ? checkCSS : checkScript)(
        source,
        file,
        variables,
      ),
    );
  }
  return diagnostics;
}
