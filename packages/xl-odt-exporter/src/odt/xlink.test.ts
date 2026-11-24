import { BlockNoteSchema } from "@blocknote/core";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vite-plus/test";
import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";

it("renders namespaced XLink attributes without React prop warnings", ({
  onTestFinished,
}) => {
  const error = vi.spyOn(console, "error");
  onTestFinished(() => {
    error.mockRestore();
  });
  const exporter = new ODTExporter(
    BlockNoteSchema.create(),
    odtDefaultSchemaMappings,
  );

  const nodes = exporter.transformInlineContent([
    {
      type: "link",
      href: "https://example.com/?x=1&y=2",
      content: [{ type: "text", text: "Example", styles: { bold: true } }],
    },
  ]);
  const xml = renderToStaticMarkup(createElement(Fragment, null, ...nodes));

  expect(xml).toContain('xlink:type="simple"');
  expect(xml).toContain('xlink:show="replace"');
  expect(xml).toContain('xlink:href="https://example.com/?x=1&amp;y=2"');
  expect(error.mock.calls.map(([message]) => message)).not.toContainEqual(
    expect.stringContaining("Invalid DOM property"),
  );
});
