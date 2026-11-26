import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

// Exercise the installed Oxlint engine, including TypeScript parsing.
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

void test("flags cloneNode and createHTMLDocument in both render and parse files", () => {
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

void test("does not flag document or ownerDocument access", () => {
  const lines = [
    `export const top = document.body;`,
    `export const spec = { parse() { return document.createElement("li"); } };`,
    `export function parseItem(el: HTMLElement) { return el.ownerDocument.createElement("li"); }`,
    `export function read(el: HTMLElement) { const { ownerDocument } = el; return ownerDocument; }`,
  ];
  assert.deepEqual(findings(lines), []);
  assert.deepEqual(findings(lines, outsideFile), []);
});

void test("reports one finding for multiple restricted properties on a line", () => {
  const lines = [
    `export const copy = () => document.implementation.createHTMLDocument("").body.cloneNode(true);`,
  ];
  assert.deepEqual(findings(lines), lines);
});

void test("an exception comment with a reason removes the finding of its line", () => {
  const lines = [
    `// oxlint-disable-next-line blocknote-dom/no-active-document -- The drag preview is a copy of the editor's own DOM.`,
    `export const preview = (el: HTMLElement) => el.cloneNode(true);`,
    `export const other = (el: HTMLElement) => el.cloneNode(true);`,
  ];
  assert.deepEqual(findings(lines), [lines[2]]);
});
