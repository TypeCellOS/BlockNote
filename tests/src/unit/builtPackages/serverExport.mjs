// Exports a document with React and optional blocks through
// `ServerBlockNoteEditor`, in plain Node from the build output, as a server
// app does.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packagesDir = resolve(import.meta.dirname, "../../../../packages");

function entry(dir, subpath = ".") {
  const pkg = JSON.parse(
    readFileSync(join(packagesDir, dir, "package.json"), "utf8"),
  );
  return pathToFileURL(resolve(packagesDir, dir, pkg.exports[subpath].import))
    .href;
}

const { BlockNoteSchema } = await import(entry("core"));
const { createReactBlockSpec } = await import(entry("react"));
const { ServerBlockNoteEditor } = await import(entry("server-util"));
const { getDocument } = await import(entry("server-util", "./dom"));
const { createReactInlineMathSpec, createReactMathBlockSpec } = await import(
  entry("math-block")
);
const { createReactDiagramBlockSpec } = await import(entry("diagram-block"));
const { withMultiColumn } = await import(entry("xl-multi-column"));
// The React that `@blocknote/react` uses, so that its hooks work.
const { createElement, useEffect } = createRequire(
  join(packagesDir, "react/package.json"),
)("react");

const reactBlock = createReactBlockSpec(
  { type: "reactBlock", propSchema: {}, content: "inline" },
  {
    render: (props) => {
      useEffect(() => {});
      return createElement("p", { ref: props.contentRef });
    },
  },
);

const schema = withMultiColumn(BlockNoteSchema.create()).extend({
  blockSpecs: {
    mathBlock: createReactMathBlockSpec(),
    diagram: createReactDiagramBlockSpec(),
    reactBlock: reactBlock(),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

const blocks = [
  {
    type: "paragraph",
    content: ["Inline ", { type: "math", content: "x^2" }, " math"],
  },
  { type: "mathBlock", content: "a^2 + b^2 = c^2" },
  { type: "diagram", content: "graph TD\n  A --> B" },
  { type: "reactBlock", content: "React block" },
  {
    type: "columnList",
    children: [
      { type: "column", children: [{ type: "paragraph", content: "Left" }] },
      { type: "column", children: [{ type: "paragraph", content: "Right" }] },
    ],
  },
];

const editor = ServerBlockNoteEditor.create({ schema }, getDocument());
await editor.blocksToMarkdownLossy(blocks);
await editor.blocksToHTMLLossy(blocks);
await editor.blocksToFullHTML(blocks);
// Node runs React's queued work before it exits. A crash there (#3230) gives a
// non-zero exit code, which fails the test.
console.log("exported");
