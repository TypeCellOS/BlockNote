import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

// Exercise the installed Oxlint engine, including scope analysis and TSX
// parsing. No ESLint dependency, mock ASTs, or browser process is needed.
const directory = mkdtempSync(join(tmpdir(), "blocknote-lint-"));
after(() => rmSync(directory, { recursive: true, force: true }));
const config = join(directory, ".oxlintrc.json");
writeFileSync(
  config,
  JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [
      {
        name: "blocknote-tests",
        specifier: fileURLToPath(
          new URL("./component-browser-tests.mjs", import.meta.url),
        ),
      },
    ],
    rules: { "blocknote-tests/component-browser-structure": "error" },
  }),
);

function lint(code, filename = "Button.browser.test.tsx") {
  const path = join(directory, filename);
  writeFileSync(path, code);
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
  const output = JSON.parse(result.stdout);
  assert.ok(
    !output.diagnostics.some(
      (item) =>
        item.severity === "error" &&
        !item.code?.includes("component-browser-structure"),
    ),
    result.stdout,
  );
  return output.diagnostics.map((item) => item.message);
}

const body = 'it("works", () => {});';
function group(name) {
  return `describe(${JSON.stringify(name)}, () => { ${body} });`;
}
function owner(content, name = "Button") {
  return `describe(${JSON.stringify(name)}, () => { ${content} });`;
}

void test("accepts all groups in order and any nonempty subset", () => {
  assert.deepEqual(
    lint(
      owner(
        ["unit", "integration", "aria", "axe", "keyboard"]
          .map(group)
          .join("\n"),
      ),
    ),
    [],
  );
  assert.deepEqual(lint(owner(group("aria"))), []);
  assert.deepEqual(lint(owner(group("unit") + group("axe"))), []);
  assert.deepEqual(lint(owner(group("aria") + group("keyboard"))), []);
});

void test("accepts separate aria and axe groups", () => {
  assert.deepEqual(
    lint(
      owner(`describe("aria", () => {
        it("exposes its role", () => { expect(button).toHaveAttribute("role", "button"); });
      });
      describe("axe", () => {
        it("has no axe violations", async () => { expect((await runAxe()).violations).toEqual([]); });
      });`),
    ),
    [],
  );
});

void test("owner is the full filename stem, not an imported symbol", () => {
  for (const name of [
    "NestBlockButtons",
    "BasicTextStyleButton",
    "DesktopFormattingToolbarController",
  ]) {
    assert.deepEqual(
      lint(owner(group("unit"), name), `${name}.browser.test.tsx`),
      [],
    );
  }
  assert.match(
    lint(
      owner(group("unit"), "NestBlockButton"),
      "NestBlockButtons.browser.test.tsx",
    )[0],
    /NestBlockButtons/,
  );
});

void test("rejects missing, multiple, or wrongly named owners", () => {
  for (const code of [
    body,
    owner(group("unit")) + owner(group("aria")),
    owner(group("unit"), "Other"),
  ]) {
    assert.match(lint(code)[0], /exactly one top-level/);
  }
});

void test("rejects out-of-order, duplicate and unknown categories", () => {
  for (const content of [
    group("aria") + group("unit"),
    group("unit") + group("unit"),
    group("aria") + group("aria"),
    group("keyboard") + group("aria"),
    group("axe") + group("aria"),
    group("a11y"),
    group("behaviour"),
    group("ARIA"),
    group("visual"),
  ]) {
    assert.match(lint(owner(content)).join("\n"), /in this order/);
  }
});

void test("rejects test declarations outside a category", () => {
  assert.match(
    lint(owner(group("unit") + body)).join("\n"),
    /inside an applicable group/,
  );
  assert.match(
    lint(owner(group("unit")) + body).join("\n"),
    /inside an applicable group/,
  );
});

void test("rejects empty, comment-only, hooks-only and nested-empty groups", () => {
  for (const content of [
    "",
    "// placeholder\n",
    "beforeEach(() => {});",
    'describe("scenario", () => {});',
  ]) {
    assert.match(
      lint(owner(`describe("unit", () => { ${content} });`)).join("\n"),
      /Omit empty/,
    );
  }
});

void test("accepts nested scenarios, hooks, TSX and parameterized registrations", () => {
  assert.deepEqual(
    lint(
      owner(`beforeEach(() => {}); describe("unit", () => {
    describe("scenario", () => {
      it.for([1, 2])("case %s", () => { const element = <button />; });
      test.each([1])("case %s", () => {});
      it.skip("not supported yet", () => {});
    });
  });`),
    ),
    [],
  );
});

void test("resolves named import aliases and namespace imports", () => {
  assert.deepEqual(
    lint(`import { describe as suite, it as check } from "vite-plus/test";
    suite("Button", () => { suite("unit", () => { check("works", () => {}); }); });`),
    [],
  );
  assert.deepEqual(
    lint(`import * as vt from "vitest";
    vt.describe("Button", () => { vt.describe("aria", () => { vt.test("works", () => {}); }); });`),
    [],
  );
});

void test("does not count shadowed names or unrelated imports as tests", () => {
  assert.match(
    lint(
      owner(
        'describe("unit", () => { const it = () => {}; it("not a test"); });',
      ),
    ).join("\n"),
    /Omit empty/,
  );
  assert.match(
    lint('import { it } from "other-library"; ' + owner(group("unit"))).join(
      "\n",
    ),
    /Omit empty/,
  );
});

void test("fixture factories and arbitrary test properties are not registrations", () => {
  assert.deepEqual(
    lint(`import { test } from "vite-plus/test";
    const extended = test.extend({});
    ${owner(group("unit"))}`),
    [],
  );
  assert.match(
    lint(owner('describe("unit", () => { test.helper(); });')).join("\n"),
    /Omit empty/,
  );
});

void test("requires static owner and category titles and inline block callbacks", () => {
  assert.match(
    lint("describe(name, () => {});").join("\n"),
    /exactly one top-level/,
  );
  assert.match(
    lint(owner('describe(name, () => { it("works", () => {}); });')).join("\n"),
    /in this order/,
  );
  assert.match(
    lint('describe("Button", registerTests);').join("\n"),
    /inline describe callback/,
  );
  assert.deepEqual(
    lint(
      'describe(`Button`, () => { describe(`unit`, () => { it("works", () => {}); }); });',
    ),
    [],
  );
});

void test("does not enforce the convention outside browser test filenames", () => {
  assert.deepEqual(lint(body, "Button.test.ts"), []);
});
