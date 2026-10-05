import {
  BlockNoteEditor,
  BlockNoteSchema,
  createInMemoryPreviewController,
  type PartialBlock,
} from "@blocknote/core";
import {
  AttributionExtension,
  DiffVersioningExtension,
} from "@blocknote/core/y";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { BlockNoteView as MantineBlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec } from "@blocknote/react";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

const customPreview = createReactBlockSpec(
  { type: "customPreview", propSchema: {}, content: "plain" },
  {
    render: ({ contentRef }) => (
      <div>
        <div data-testid="custom-rendered-surface">Custom rendered surface</div>
        <code ref={contentRef} style={{ display: "none" }} />
      </div>
    ),
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    mathBlock: createReactMathBlockSpec(),
    diagram: createReactDiagramBlockSpec(),
    customPreview: customPreview(),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});

test("only attributes the edited text and labels an unnamed version with its timestamp", async () => {
  const editor = BlockNoteEditor.create({
    extensions: [DiffVersioningExtension()],
  });
  try {
    await render(<MantineBlockNoteView editor={editor} />);
    editor.replaceBlocks(editor.document, [
      {
        id: "milestone",
        type: "bulletListItem",
        content: "Beta with five design partners (June)",
      },
    ]);
    const snapshot = editor.document;
    editor.replaceBlocks(editor.document, [
      {
        id: "milestone",
        type: "bulletListItem",
        content: "Beta with five design partners",
      },
    ]);
    const createdAt = new Date(2026, 8, 29, 13, 21).getTime();
    const preview = createInMemoryPreviewController(editor);
    preview.enterPreview(snapshot, editor.document, undefined, {
      target: { kind: "snapshot", snapshot: { id: "unnamed", createdAt } },
    });
    const paragraph = editor.domElement!.querySelector<HTMLElement>(
      '.bn-block[data-id="milestone"] .bn-inline-content',
    )!;
    // Hover the unchanged prefix, then the block's padding, not the insertion.
    paragraph.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
    expect(document.querySelector(".bn-suggestion-tooltip")).toBeNull();
    paragraph.parentElement!.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true }),
    );
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
    expect(document.querySelector(".bn-suggestion-tooltip")).toBeNull();

    await userEvent.hover(
      paragraph.querySelector<HTMLElement>("ins .bn-suggestion-mark")!,
    );
    const date = new Date(createdAt);
    const label = `${date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    await vi.waitFor(() =>
      expect(
        document.querySelector(".bn-suggestion-tooltip")?.textContent,
      ).toBe(`Inserted in: ${label}`),
    );
    paragraph.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.querySelector(".bn-suggestion-tooltip")).toBeNull(),
    );
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("anchors an inline math change tooltip to the formula, not the paragraph", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [DiffVersioningExtension()],
  });
  try {
    await render(
      <div style={{ paddingTop: 100 }}>
        <MantineBlockNoteView editor={editor} />
      </div>,
    );
    editor.replaceBlocks(editor.document, [
      {
        id: "inline-math",
        type: "paragraph",
        content: ["before ", { type: "math", content: "x^2" }, " after"],
      },
    ]);
    const snapshot = editor.document;
    editor.replaceBlocks(editor.document, [
      {
        id: "inline-math",
        type: "paragraph",
        content: ["before ", { type: "math", content: "" }, " after"],
      },
    ]);
    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(snapshot, editor.document, "Draft 3");
    const formula = await vi.waitFor(() => {
      const element = editor.domElement?.querySelector<HTMLElement>(
        '.bn-block[data-id="inline-math"] .bn-preview-container',
      );
      if (!element?.firstElementChild) {
        throw new Error("Inline math preview did not render");
      }
      return element;
    });
    await userEvent.hover(formula);
    expect(formula.querySelector("[data-user-ids]")).toBeNull();
    expect(
      formula.parentElement?.querySelector(
        ".bn-source-block-popup [data-user-ids]",
      ),
    ).not.toBeNull();
    await vi.waitFor(() =>
      expect(
        document.querySelector(".bn-suggestion-tooltip")?.textContent,
      ).toBe("Inserted in: Draft 3"),
    );
    const tooltip = document.querySelector<HTMLElement>(
      ".bn-suggestion-tooltip",
    )!;
    const formulaRect = formula.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    expect(Math.abs(tooltipRect.left - formulaRect.left)).toBeLessThan(30);
    expect(
      tooltipRect.bottom <= formulaRect.top ||
        tooltipRect.top >= formulaRect.bottom,
    ).toBe(true);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("does not attribute unchanged content to a sibling's change", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [DiffVersioningExtension()],
  });
  try {
    await render(<MantineBlockNoteView editor={editor} />);
    editor.replaceBlocks(editor.document, [
      {
        id: "siblings",
        type: "paragraph",
        content: ["unchanged ", { type: "math", content: "x^2" }],
      },
    ]);
    const snapshot = editor.document;
    editor.replaceBlocks(editor.document, [
      {
        id: "siblings",
        type: "paragraph",
        content: ["", { type: "math", content: "x^2" }],
      },
    ]);
    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(snapshot, editor.document, "Draft 3");
    const formula = await vi.waitFor(() => {
      const element = editor.domElement?.querySelector<HTMLElement>(
        '.bn-block[data-id="siblings"] .bn-preview-container',
      );
      if (!element?.firstElementChild) {
        throw new Error("Formula preview did not render");
      }
      return element;
    });
    await userEvent.hover(formula);
    expect(
      editor.domElement?.querySelector(
        '.bn-block[data-id="siblings"] [data-user-ids]',
      ),
    ).not.toBeNull();
    expect(document.querySelector(".bn-suggestion-tooltip")).toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("shows an attribution for a partial change within inline math", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [DiffVersioningExtension()],
  });
  try {
    await render(<MantineBlockNoteView editor={editor} />);
    editor.replaceBlocks(editor.document, [
      {
        id: "partial-math",
        type: "paragraph",
        content: [{ type: "math", content: "x+y" }],
      },
    ]);
    const snapshot = editor.document;
    editor.replaceBlocks(editor.document, [
      {
        id: "partial-math",
        type: "paragraph",
        content: [{ type: "math", content: "x+z" }],
      },
    ]);
    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(snapshot, editor.document, "Draft 3");
    const formula = await vi.waitFor(() => {
      const element = editor.domElement?.querySelector<HTMLElement>(
        '.bn-block[data-id="partial-math"] .bn-preview-container',
      );
      if (!element?.firstElementChild) {
        throw new Error("Formula preview did not render");
      }
      return element;
    });
    await userEvent.hover(formula);
    await vi.waitFor(() =>
      expect(
        document.querySelector(".bn-suggestion-tooltip")?.textContent,
      ).toContain("Draft 3"),
    );
  } finally {
    editor._tiptapEditor.destroy();
  }
});

const cases: Array<{
  name: string;
  block: PartialBlock<typeof schema.blockSchema>;
  preview: string;
}> = [
  {
    name: "custom block with a separate rendered surface",
    block: { type: "customPreview", content: "custom source" },
    preview: "[data-testid='custom-rendered-surface']",
  },
  {
    name: "edited math",
    block: { type: "mathBlock", content: "x^2" },
    preview: ".bn-preview-container",
  },
  {
    name: "edited diagram",
    block: { type: "diagram", content: "graph TD; A-->B;" },
    preview: ".bn-preview-container",
  },
  {
    name: "new file",
    block: {
      type: "file",
      props: { url: "https://example.com/example.pdf", name: "example.pdf" },
    },
    preview: ".bn-file-block-content-wrapper",
  },
];

test.each(cases)(
  "shows the version attribution tooltip over the $name preview",
  async ({ block, preview: selector }) => {
    const editor = BlockNoteEditor.create({
      schema,
      extensions: [DiffVersioningExtension()],
    });

    try {
      await render(
        <div style={{ paddingTop: 100 }}>
          <MantineBlockNoteView editor={editor} />
        </div>,
      );
      editor.replaceBlocks(editor.document, [{ ...block, id: "inserted" }]);
      const snapshot = editor.document;
      if (block.type !== "file") {
        // These blocks keep their identity between versions: only source text
        // changes, and the visible surface does not contain that marked text.
        editor.replaceBlocks(editor.document, [
          { ...block, id: "inserted", content: undefined },
        ]);
      }
      const baseline = block.type === "file" ? [] : editor.document;
      editor
        .getExtension(DiffVersioningExtension)!
        .renderDiff(snapshot, baseline, "Draft 3");

      const preview = await vi.waitFor(() => {
        const element = editor.domElement?.querySelector<HTMLElement>(
          `.bn-block[data-id="inserted"] ${selector}`,
        );
        if (!element) {
          throw new Error("Inserted block preview did not render");
        }
        return element;
      });
      if (block.type === "customPreview") {
        expect(preview.closest(".bn-preview-container")).toBeNull();
      }
      await vi.waitFor(() => {
        if (selector === ".bn-preview-container") {
          expect(preview.children.length).toBeGreaterThan(0);
        }
      });
      await userEvent.hover(preview);
      if (block.type !== "file") {
        if (block.type !== "customPreview") {
          expect(preview.parentElement?.getAttribute("data-open")).toBe(
            "false",
          );
        }
        const source = editor.domElement?.querySelector<HTMLElement>(
          '.bn-block[data-id="inserted"] .bn-inline-content [data-user-ids]',
        );
        expect(source?.textContent).toBe(block.content);
        expect(preview.querySelector("[data-user-ids]")).toBeNull();
      }

      if (block.type === "mathBlock" || block.type === "diagram") {
        const previewStyle = getComputedStyle(preview);
        expect(previewStyle.boxShadow).not.toBe("none");
        expect(previewStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      }

      await vi.waitFor(() =>
        expect(
          document.querySelector(".bn-suggestion-tooltip")?.textContent,
        ).toBe("Inserted in: Draft 3"),
      );
      await vi.waitFor(() => {
        const tooltip = document.querySelector<HTMLElement>(
          ".bn-suggestion-tooltip",
        )!;
        const tooltipContainer = tooltip.parentElement?.parentElement;
        expect(tooltipContainer).toBeTruthy();
        expect(getComputedStyle(tooltipContainer!).visibility).not.toBe(
          "hidden",
        );
        const previewRect = preview.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        expect(tooltipRect.width).toBeGreaterThan(0);
        expect(Math.abs(tooltipRect.left - previewRect.left)).toBeLessThan(100);
        expect(
          tooltipRect.bottom <= previewRect.top ||
            tooltipRect.top >= previewRect.bottom,
        ).toBe(true);
      });
    } finally {
      editor._tiptapEditor.destroy();
    }
  },
);

test("frames an attributed math preview", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [DiffVersioningExtension()],
  });
  try {
    await render(
      <div data-testid="math-preview-frame" style={{ padding: 24 }}>
        <MantineBlockNoteView editor={editor} />
      </div>,
    );
    editor.replaceBlocks(editor.document, [
      { id: "math-preview", type: "mathBlock", content: "x^2" },
    ]);
    const snapshot = editor.document;
    editor.replaceBlocks(editor.document, [
      { id: "math-preview", type: "mathBlock" },
    ]);
    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(snapshot, editor.document, "Draft 3");
    await vi.waitFor(() => {
      const element = editor.domElement?.querySelector<HTMLElement>(
        '.bn-block[data-id="math-preview"] .bn-preview-container',
      );
      if (!element?.firstElementChild) {
        throw new Error("Math preview did not render");
      }
      return element;
    });
    await expectElement(
      document.querySelector('[data-testid="math-preview-frame"]'),
    ).toMatchScreenshot("versioning-math-preview");
  } finally {
    editor._tiptapEditor.destroy();
  }
});
