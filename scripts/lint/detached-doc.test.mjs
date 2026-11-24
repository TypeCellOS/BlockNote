import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

// Exercise the installed Oxlint engine, including scope analysis and
// TypeScript parsing, as component-browser-tests.test.mjs does.
const directory = mkdtempSync(join(tmpdir(), "blocknote-lint-"));
after(() => rmSync(directory, { recursive: true, force: true }));
const config = join(directory, ".oxlintrc.json");
writeFileSync(
  config,
  JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [
      {
        name: "blocknote-dom",
        specifier: fileURLToPath(
          new URL("./detached-doc.mjs", import.meta.url),
        ),
      },
    ],
    rules: { "blocknote-dom/no-active-document": "error" },
  }),
);

// A file with render code, and a file that only handles content from outside.
const renderFile = "blocks/Paragraph/block.ts";
const outsideFile = "api/parsers/html/util/nestedLists.ts";

// Each case is one line of the file. Returns the line of each finding.
function findings(lines, file = renderFile) {
  const path = join(directory, "packages/core/src", file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"));
  const result = spawnSync(
    "vp",
    ["lint", "--config", config, "--format", "json", path],
    { encoding: "utf8" },
  );
  assert.ifError(result.error);
  assert.ok(
    result.status === 0 || result.status === 1,
    `Oxlint failed: ${result.stdout}\n${result.stderr}`,
  );
  const { diagnostics } = JSON.parse(result.stdout);
  for (const item of diagnostics) {
    assert.equal(item.code, "blocknote-dom(no-active-document)");
    assert.match(item.message, /stays in `detachedDoc\(\)`/);
  }
  return diagnostics
    .map((item) => item.labels[0].span.line)
    .sort((a, b) => a - b)
    .map((line) => lines[line - 1]);
}

void test("check 1: cloneNode and createHTMLDocument, in each file", () => {
  const lines = [
    `export const render = (el: HTMLElement) => el.cloneNode(true);`,
    `export const copy = (el?: HTMLElement) => el?.["cloneNode"](true);`,
    `export function clone(el: HTMLElement) { const { cloneNode } = el; return cloneNode; }`,
    `export const second = (doc: Document) => doc.implementation.createHTMLDocument("");`,
  ];
  assert.deepEqual(findings(lines), lines);
  assert.deepEqual(findings(lines, outsideFile), lines);
  assert.deepEqual(
    findings([
      `declare function detachedDoc(): Document;`,
      `export const copy = (el: HTMLElement) => detachedDoc().importNode(el, true);`,
      `export const names = { cloneNode: 1, createHTMLDocument: 2 };`,
      `export function cloneNode(el: HTMLElement) { return detachedDoc().importNode(el, true); }`,
    ]),
    [],
  );
});

void test("check 2: document and ownerDocument, in a file for content from outside", () => {
  const lines = [
    `export const top = document.body;`,
    `export function liftNestedLists() { return document.createElement("li"); }`,
    `export function normalize(el: HTMLElement) { return el.ownerDocument.createElement("li"); }`,
    `export function read(el: HTMLElement) { const { ownerDocument } = el; return ownerDocument; }`,
  ];
  for (const file of [
    outsideFile,
    "api/clipboard/fromClipboard/normalizeOfficeHTML.ts",
    "api/exporters/markdown/htmlToMarkdown.ts",
    "blocks/File/helpers/parse/read.ts",
    "blocks/getDetailsContent.ts",
    "blocks/ListItem/getListItemContent.ts",
  ]) {
    assert.deepEqual(findings(lines, file), lines, file);
  }
  // Render code makes its elements in the active document on purpose.
  for (const file of [
    renderFile,
    "api/exporters/html/externalHTMLExporter.ts",
    "blocks/File/helpers/render/createFileBlockWrapper.ts",
    "blocks/defaultBlockHelpers.ts",
  ]) {
    assert.deepEqual(findings(lines, file), [], file);
  }
  assert.deepEqual(
    findings(
      [
        `declare function detachedDoc(): Document;`,
        `export function local() { const document = detachedDoc(); return document.createElement("li"); }`,
        `export function property(editor: { document: unknown[] }) { return editor.document; }`,
        `export const names = { document: 1, ownerDocument: 2 };`,
      ],
      outsideFile,
    ),
    [],
  );
});

void test("check 3: document and ownerDocument, in a parse function of each file", () => {
  const lines = [
    `export const a = { parse(el: HTMLElement) { return document.createElement("div"); } };`,
    `export const b = { parse: (el: HTMLElement) => el.ownerDocument };`,
    `export const c = { parseContent: function (el: HTMLElement) { return document.body; } };`,
    `export const d = { "parse": ((el: HTMLElement) => document.body) as unknown };`,
    `export const imageParse = (config: unknown) => (el: HTMLElement) => document.createElement("img");`,
    `export function parseTableContent(node: HTMLElement) { const { ownerDocument } = node; return ownerDocument; }`,
    `export function blockContentParser() { return (node: HTMLElement) => document.importNode(node, true); }`,
    `export class Node { parseHTML() { return [{ tag: "p" }, document.title]; } }`,
    `export class Mark { static parseHTML = () => document.title; }`,
  ];
  assert.deepEqual(findings(lines), lines);

  // The functions in a parse function, for example of a parse rule.
  const rules = [
    `export const node = { parseHTML() { return [{`,
    `  getAttrs: (el: HTMLElement) => ({ title: document.title }),`,
    `  getContent: (el: HTMLElement) => el.ownerDocument.createElement("p"),`,
    `}]; } };`,
    `export function getParseRules() { return [{`,
    `  contentElement: (el: HTMLElement) => document.body,`,
    `}]; }`,
  ];
  assert.deepEqual(findings(rules), [rules[1], rules[2], rules[5]]);

  assert.deepEqual(
    findings([
      `declare function detachedDoc(): Document;`,
      `export const a = { render() { return document.createElement("p"); } };`,
      `export const b = { toExternalHTML: (el: HTMLElement) => el.ownerDocument };`,
      // A function that only has the name of a function of a parse rule.
      `export const versioning = { getContent(id: string) { return document.title + id; } };`,
      `export function sparse() { return document.title; }`,
      `export const parser = document.body;`,
      `export const c = { parse(el: HTMLElement) { return detachedDoc().importNode(el, true); } };`,
      `export const d = { parse(el: HTMLElement, document: Document) { return document.importNode(el, true); } };`,
      `export const e = { parse(editor: { document: unknown[] }) { return editor.document; } };`,
    ]),
    [],
  );
});

void test("a line that matches two checks gives one finding", () => {
  // Checks 2 and 3: a parse function in a file for content from outside.
  const parse = [
    `export function parseInline(el: HTMLElement) { return document.createElement("a"); }`,
    `export const rule = { getAttrs: (el: HTMLElement) => el.ownerDocument };`,
  ];
  assert.deepEqual(findings(parse, outsideFile), parse);
  // Checks 1 and 2, and checks 1 and 3: two names on one line.
  const second = [
    `export const second = () => document.implementation.createHTMLDocument("");`,
  ];
  assert.deepEqual(findings(second, outsideFile), second);
  const clone = [
    `export const a = { parse: (el: HTMLElement) => el.ownerDocument.body.cloneNode(true) };`,
  ];
  assert.deepEqual(findings(clone), clone);
});

void test("an exception comment with a reason removes the finding of its line", () => {
  const lines = [
    `// oxlint-disable-next-line blocknote-dom/no-active-document -- The drag preview is a copy of the editor's own DOM.`,
    `export const preview = (el: HTMLElement) => el.cloneNode(true);`,
    `export const other = (el: HTMLElement) => el.cloneNode(true);`,
  ];
  assert.deepEqual(findings(lines), [lines[2]]);
});
