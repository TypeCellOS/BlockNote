import { createElement } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { expect, test, vi } from "vite-plus/test";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  BlockNoteEditor,
  createBlockSpec,
} from "@blocknote/core";

function parseHTML(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

for (const html of [
  "text<!--comment--><aside></aside>",
  "<!--comment-->text<aside></aside>",
  "text",
  "",
]) {
  test(`external: preserves fallback fragment roots ${JSON.stringify(html)}`, () => {
    let calls = 0;
    const fragment = createBlockSpec(
      { type: "fragment", propSchema: {}, content: "none" },
      {
        render() {
          const template = document.createElement("template");
          template.innerHTML = html;
          return { dom: template.content };
        },
        postProcessHTML({ root, blockOutputs }) {
          calls++;
          expect(blockOutputs.size).toBe(1);
          const output = Array.from(blockOutputs.values())[0];
          const expected = parseHTML(html);
          expect(output.nodes.map((node) => node.nodeType)).toEqual(
            Array.from(expected.childNodes, (node) => node.nodeType),
          );
          expect(output.elements.length).toBe(expected.children.length);
          expect(Array.from(root.childNodes)).toEqual(output.nodes);
        },
      },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, fragment },
      }),
    });

    expect(editor.blocksToHTMLLossy([{ type: "fragment" }])).toBe(html);
    expect(calls).toBe(1);
  });
}

for (const format of ["internal", "external"] as const) {
  test(`${format}: layout slots, fallback frames and explicit external renderers`, () => {
    const calls: string[] = [];
    const framed = createBlockSpec(
      { type: "framed", propSchema: {}, content: "inline" },
      {
        render() {
          const dom = document.createElement("p");
          return { dom, contentDOM: dom };
        },
        renderFrame() {
          const dom = document.createElement("aside");
          return { dom, slot: dom };
        },
        postProcessHTML({ blockOutputs }) {
          calls.push("framed");
          expect(blockOutputs.size).toBe(1);
          for (const { nodes } of blockOutputs.values()) {
            const root = nodes[0];
            expect(root instanceof Element).toBe(true);
            expect(root.textContent).toContain("nested-child");
            expect(root.getRootNode().textContent).toContain("after-panel");
            if (root instanceof Element) {
              const frame = root.matches("aside")
                ? root
                : root.querySelector("aside");
              expect(frame).not.toBeNull();
              frame?.setAttribute("data-frame-finalized", "true");
            }
          }
        },
      },
    )();
    const panel = createBlockSpec(
      { type: "panel", propSchema: {}, content: "none", layoutOnly: true },
      {
        renderFrame() {
          const dom = document.createElement("section");
          return { dom, slot: dom };
        },
        toExternalHTML() {
          const dom = document.createElement("article");
          return { dom, childrenDOM: dom };
        },
        postProcessHTML({ blockOutputs }) {
          calls.push("panel");
          for (const { nodes } of blockOutputs.values()) {
            expect(nodes).toHaveLength(1);
            expect(nodes[0].nodeName).toBe(
              format === "internal" ? "SECTION" : "ARTICLE",
            );
            expect(nodes[0].textContent).toContain("nested-child");
          }
        },
      },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, panel, framed },
      }),
    });
    try {
      const blocks = [
        {
          type: "panel" as const,
          children: [
            {
              type: "framed" as const,
              content: "framed-content",
              children: [
                { type: "paragraph" as const, content: "nested-child" },
              ],
            },
          ],
        },
        { type: "paragraph" as const, content: "after-panel" },
      ];
      const html =
        format === "internal"
          ? editor.blocksToFullHTML(blocks)
          : editor.blocksToHTMLLossy(blocks);
      expect(
        parseHTML(html).querySelector("aside[data-frame-finalized]"),
      ).not.toBeNull();
      expect(calls.sort()).toEqual(["framed", "panel"]);
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  test(`${format}: one batch after assembly, with render identities and surviving roots`, () => {
    const rendered = new Set<object>();
    const batches: number[] = [];
    const unusedHook = vi.fn();
    const spec = createBlockSpec(
      {
        type: "batch",
        propSchema: { label: { default: "default-label" } },
        content: "none",
      },
      {
        render(block) {
          rendered.add(block);
          const dom = document.createDocumentFragment();
          const label = document.createElement("label");
          label.textContent = block.props.label;
          const emptyInlineContent = document.createElement("span");
          emptyInlineContent.className = "bn-inline-content";
          label.appendChild(emptyInlineContent);
          dom.append(
            label,
            "text-root",
            document.createComment("comment-root"),
          );
          return { dom };
        },
        postProcessHTML({ blockOutputs, root }) {
          batches.push(blockOutputs.size);
          expect(rendered.size).toBe(3);
          expect(root.nodeType).toBe(
            format === "internal"
              ? Node.ELEMENT_NODE
              : Node.DOCUMENT_FRAGMENT_NODE,
          );
          expect(root.querySelector("p")?.textContent).toBe(
            "following-sibling",
          );
          for (const [block, output] of blockOutputs) {
            const { nodes, elements } = output;
            expect(elements).toHaveLength(1);
            expect(elements[0]).toBe(nodes[0]);
            expect(output.elements).toBe(elements);
            expect(rendered.has(block)).toBe(true);
            expect(block.props?.label).toBe("default-label");
            expect(nodes).toHaveLength(format === "external" ? 3 : 1);
            for (const node of nodes) {
              expect(node.nodeType).not.toBe(Node.DOCUMENT_FRAGMENT_NODE);
              expect(node.getRootNode()).toBe(root);
              // All parents, descendants and following siblings already exist.
              expect(node.getRootNode().textContent).toContain(
                "following-sibling",
              );
              if (node instanceof Element) {
                node.setAttribute("data-finalized", format);
              }
            }
          }
          root.appendChild(document.createComment("export-root-finalized"));
        },
      },
    )();
    const unused = createBlockSpec(
      { type: "unused", propSchema: {}, content: "none" },
      {
        render() {
          return { dom: document.createElement("div") };
        },
        postProcessHTML: unusedHook,
      },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, batch: spec, unused },
      }),
    });
    const props = Object.freeze({});
    const blocks = [
      { type: "batch" as const, props, children: [{ type: "batch" as const }] },
      { type: "batch" as const },
      { type: "paragraph" as const, content: "following-sibling" },
    ];
    try {
      for (let i = 0; i < 2; i++) {
        rendered.clear();
        const html =
          format === "internal"
            ? editor.blocksToFullHTML(blocks)
            : editor.blocksToHTMLLossy(blocks);
        expect(
          parseHTML(html).querySelectorAll("[data-finalized]"),
        ).toHaveLength(3);
        expect(html).toContain("<!--export-root-finalized-->");
        if (format === "external") {
          expect(
            parseHTML(html).querySelector(".ProseMirror-trailingBreak"),
          ).toBeNull();
        }
      }
      expect(batches).toEqual([3, 3]);
      expect(props).toEqual({});
      expect(unusedHook).not.toHaveBeenCalled();
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  test(`${format}: React block specs retain the DOM hook`, () => {
    let calls = 0;
    const spec = createReactBlockSpec(
      { type: "reactBatch", propSchema: {}, content: "none" },
      {
        render() {
          return createElement("span", null, "React output");
        },
        postProcessHTML({ blockOutputs, root }) {
          calls++;
          expect(blockOutputs.size).toBe(1);
          expect(root.textContent).toContain("React output");
          for (const { nodes } of blockOutputs.values()) {
            for (const node of nodes) {
              expect(node.getRootNode()).toBe(root);
              if (node instanceof Element) {
                node.setAttribute("data-react-finalized", "true");
              }
            }
          }
        },
      },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, reactBatch: spec },
      }),
    });
    try {
      const blocks = [{ type: "reactBatch" as const }];
      const html =
        format === "internal"
          ? editor.blocksToFullHTML(blocks)
          : editor.blocksToHTMLLossy(blocks);
      expect(calls).toBe(1);
      expect(
        parseHTML(html).querySelector("[data-react-finalized]"),
      ).not.toBeNull();
    } finally {
      editor._tiptapEditor.destroy();
    }
  });
}

test("built-in finalization restores empty inline content after block hooks", () => {
  const cleared = createBlockSpec(
    { type: "cleared", propSchema: {}, content: "inline" },
    {
      render() {
        const dom = document.createElement("p");
        return { dom, contentDOM: dom };
      },
      postProcessHTML({ blockOutputs }) {
        for (const { nodes } of blockOutputs.values()) {
          for (const node of nodes) {
            if (node instanceof Element) {
              node.querySelector(".bn-inline-content")?.replaceChildren();
            }
          }
        }
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, cleared },
    }),
  });
  try {
    const html = editor.blocksToFullHTML([
      { type: "cleared", content: "cleared by hook" },
    ]);
    expect(
      parseHTML(html).querySelector(
        ".bn-inline-content > .ProseMirror-trailingBreak",
      ),
    ).not.toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("numbering uses immediate siblings, independent of nested groups", () => {
  const editor = BlockNoteEditor.create();
  try {
    const html = editor.blocksToFullHTML([
      {
        type: "numberedListItem",
        props: { start: 4 },
        children: [{ type: "numberedListItem", props: { start: 20 } }],
      },
      { type: "numberedListItem" },
      {
        type: "paragraph",
        children: [{ type: "numberedListItem", props: { start: 30 } }],
      },
      { type: "numberedListItem", props: { start: 7 } },
      { type: "numberedListItem", props: { start: 99 } },
    ]);
    expect(
      Array.from(
        parseHTML(html).querySelectorAll(
          '[data-content-type="numberedListItem"]',
        ),
        (element) => element.getAttribute("data-index"),
      ),
    ).toEqual(["4", "20", "5", "30", "7", "8"]);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("static built-ins preserve internal and external behavior", () => {
  const editor = BlockNoteEditor.create();
  try {
    const blocks = [
      { type: "checkListItem" as const, props: { checked: true } },
      { type: "toggleListItem" as const },
      { type: "heading" as const, props: { isToggleable: true } },
      {
        type: "table" as const,
        content: { type: "tableContent" as const, rows: [{ cells: [""] }] },
      },
      { type: "paragraph" as const },
      { type: "numberedListItem" as const },
      { type: "numberedListItem" as const },
    ];
    const internal = parseHTML(editor.blocksToFullHTML(blocks));
    expect(internal.querySelector("input")?.disabled).toBe(true);
    expect(
      internal.querySelectorAll('.bn-toggle-button[aria-expanded="true"]'),
    ).toHaveLength(2);
    expect(internal.querySelector(".tableWrapper-inner")).not.toBeNull();
    expect(
      internal
        .querySelector("table")
        ?.style.getPropertyValue("--default-cell-min-width"),
    ).not.toBe("");
    expect(
      internal.querySelectorAll(".ProseMirror-trailingBreak").length,
    ).toBeGreaterThan(0);

    const external = parseHTML(editor.blocksToHTMLLossy(blocks));
    expect(external.querySelector("input")?.disabled).toBe(false);
    expect(external.querySelectorAll("details[open]")).toHaveLength(2);
    expect(external.querySelector(".tableWrapper")).toBeNull();
    expect(
      external
        .querySelector("table")
        ?.style.getPropertyValue("--default-cell-min-width"),
    ).toBe("");
    expect(external.querySelector("[data-index]")).toBeNull();
    expect(external.querySelectorAll("ol > li")).toHaveLength(2);
    expect(external.querySelector(".ProseMirror-trailingBreak")).toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
});
