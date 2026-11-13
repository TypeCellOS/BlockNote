import { commands } from "@root/tests/src/utils/context.js";
import {
  COLORS_DEFAULT,
  defaultBlockSpecs,
  type PartialBlock,
  type BlockNoteEditor,
  type DefaultBlockSchema,
  type PartialInlineContentElement,
  type Styles,
  type PartialTableCell,
  type PartialTableContent,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type PropSchema,
} from "@blocknote/core";
import { expect, test } from "vite-plus/test";
import { page, server } from "vite-plus/test/browser";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { render } from "vitest-browser-react";
import { useEffect } from "react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { screenshotFull } from "@root/tests/src/utils/screenshotFull.js";

function TestEditor({
  initialContent,
  editable,
  theme,
  onReady,
}: {
  initialContent: PartialBlock[];
  editable: boolean;
  theme: "light" | "dark";
  onReady: (editor: BlockNoteEditor) => void;
}) {
  const editor = useCreateBlockNote({ initialContent });
  useEffect(() => onReady(editor), [editor, onReady]);
  return (
    <main style={{ maxWidth: 900, margin: "80px auto", padding: 24 }}>
      <h1>BlockNote accessibility fixture</h1>
      <button type="button">Before editor</button>
      <BlockNoteView editor={editor} theme={theme} editable={editable} />
      <button type="button">After editor</button>
    </main>
  );
}

export async function renderTestEditor(
  initialContent: PartialBlock[],
  {
    editable = true,
    theme = "light",
  }: {
    editable?: boolean;
    theme?: "light" | "dark";
  } = {},
) {
  let editor: BlockNoteEditor | undefined;
  await page.viewport(1280, 900);
  await render(
    <TestEditor
      initialContent={initialContent}
      editable={editable}
      onReady={(instance) => {
        editor = instance;
      }}
      theme={theme}
    />,
  );
  await expect.element(page.getByRole("textbox")).toBeVisible();
  await expect
    .element(page.getByRole("textbox"))
    .toHaveAttribute("contenteditable", String(editable));
  await document.fonts.ready;
  page
    .getByRole("button", { name: "Before editor", exact: true })
    .element()
    .focus();
  if (!editor) {
    throw new Error("Test editor did not mount");
  }
  return editor;
}

const screenReader =
  server.config.name === "voiceover" || server.config.name === "nvda";

const styleExamples = {
  bold: { bold: true },
  italic: { italic: true },
  underline: { underline: true },
  strike: { strike: true },
  code: { code: true },
  textColor: { textColor: "blue" },
  backgroundColor: { backgroundColor: "yellow" },
} satisfies {
  [K in keyof DefaultStyleSchema]: Required<
    Pick<Styles<DefaultStyleSchema>, K>
  >;
};

const inlineExamples = {
  text: { type: "text", text: "Plain text. ", styles: {} },
  link: {
    type: "link",
    href: "https://www.blocknotejs.org/",
    content: "BlockNote documentation",
  },
} satisfies Record<
  keyof DefaultInlineContentSchema,
  PartialInlineContentElement<DefaultInlineContentSchema, DefaultStyleSchema>
>;

const blockExamples = {
  paragraph: {
    type: "paragraph",
    content: [
      ...Object.values(inlineExamples),
      // Use separate text spans because code excludes other formatting marks.
      ...Object.entries(styleExamples).map(([name, styles]) => ({
        type: "text" as const,
        text: ` ${name}.`,
        styles,
      })),
    ],
  },
  heading: {
    type: "heading",
    props: { level: 1 },
    content: "Heading level one",
  },
  bulletListItem: { type: "bulletListItem", content: "Bullet list item" },
  numberedListItem: { type: "numberedListItem", content: "Numbered list item" },
  checkListItem: { type: "checkListItem", content: "Unchecked task" },
  toggleListItem: {
    type: "toggleListItem",
    content: "Toggle list item",
    children: [{ type: "paragraph", content: "Toggle child" }],
  },
  quote: { type: "quote", content: "Quoted text" },
  codeBlock: { type: "codeBlock", content: "const answer = 42;" },
  divider: { type: "divider" },
  table: {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: ["Name", "Description"] },
        { cells: ["Example", "Table cell"] },
      ],
    },
  },
  image: {
    type: "image",
    props: {
      url: "/image.svg",
      name: "Example image",
      caption: "Blue square",
      previewWidth: 100,
    },
  },
  audio: {
    type: "audio",
    props: { url: "/tone.wav", name: "tone.wav", caption: "A short test tone" },
  },
  video: {
    type: "video",
    props: {
      url: "/video.webm",
      name: "video.webm",
      caption: "A flower moving in the breeze",
      previewWidth: 200,
    },
  },
  file: { type: "file", props: { url: "/example.txt", name: "example.txt" } },
} satisfies { [K in keyof DefaultBlockSchema]: PartialBlock & { type: K } };

export const defaultSchemaDocument: PartialBlock[] = [
  { id: "start", type: "paragraph", content: "Start of document" },
  ...Object.entries(blockExamples).map(([id, block]): PartialBlock => {
    if ("children" in block) {
      return {
        ...block,
        id,
        children: block.children.map((child, index) => ({
          ...child,
          id: `${id}-child-${index}`,
        })),
      };
    }
    return { ...block, id };
  }),
  ...[2, 3, 4, 5, 6].map((level) => ({
    id: `heading-${level}`,
    type: "heading" as const,
    props: { level },
    content: `Heading level ${level}`,
  })),
  {
    id: "toggle-heading",
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Toggle heading",
    children: [
      {
        id: "toggle-heading-child",
        type: "paragraph",
        content: "Heading child",
      },
    ],
  },
  {
    id: "checked",
    type: "checkListItem",
    props: { checked: true },
    content: "Completed task",
  },
  { id: "end", type: "paragraph", content: "End of document" },
];

const tableNavigationDocument: PartialBlock[] = [
  { ...blockExamples.table, id: "table" },
];

const readOnlyLinkDocument: PartialBlock[] = [
  {
    type: "paragraph",
    content: [
      {
        type: "link",
        href: "https://www.blocknotejs.org/",
        content: "Documentation",
      },
    ],
  },
];

const editorEscapeDocument: PartialBlock[] = [
  { type: "paragraph", content: "Editable text" },
];

// Each block gets its own base and one variant per individual prop value.
// Required strings/numbers use the example/default; optional ones additionally
// cover undefined. Theme colors are the exception: their foreground/background
// combinations are covered separately below to check contrast.
function propValues(
  spec: PropSchema[string],
  baseValue: string | number | boolean | undefined,
): readonly (string | number | boolean | undefined)[] {
  if (spec.values) {
    return spec.default === undefined
      ? [undefined, ...spec.values]
      : spec.values;
  }
  if (typeof spec.default === "boolean") {
    return [false, true];
  }
  if (spec.default !== undefined) {
    return [baseValue];
  }
  switch (spec.type) {
    case "boolean":
      return [undefined, false, true];
    case "number":
      return [undefined, baseValue ?? 1];
    case "string":
      return [undefined, baseValue ?? "Example text"];
  }
}

type Cell = PartialTableCell<DefaultInlineContentSchema, DefaultStyleSchema>;
function cell(content: string, props: Cell["props"] = {}): Cell {
  return { type: "tableCell", content, props };
}

const baseTableContent = {
  type: "tableContent",
  rows: [
    { cells: [cell("Name"), cell("Description")] },
    { cells: [cell("Example"), cell("Table cell")] },
  ],
} satisfies PartialTableContent<DefaultInlineContentSchema, DefaultStyleSchema>;

const colors = ["default", ...Object.keys(COLORS_DEFAULT)];
const colorPairs = colors.flatMap((textColor) =>
  colors.map((backgroundColor) => ({ textColor, backgroundColor })),
);

const schemaDocument: PartialBlock[] = [
  ...Object.values(blockExamples).flatMap((example): PartialBlock[] => {
    const block: PartialBlock = example;
    const props: Record<string, string | number | boolean | undefined> =
      block.props ?? {};
    const propSchema = defaultBlockSpecs[example.type].config.propSchema;
    const colorVariants: Record<string, string>[] =
      "textColor" in propSchema && "backgroundColor" in propSchema
        ? colorPairs
        : "textColor" in propSchema
          ? colors.map((textColor) => ({ textColor }))
          : "backgroundColor" in propSchema
            ? colors.map((backgroundColor) => ({ backgroundColor }))
            : [];
    return [
      { ...block, id: `schema-${example.type}-base` },
      ...colorVariants.flatMap((colorProps, index): PartialBlock[] => {
        const isBase = Object.entries(colorProps).every(
          ([name, value]) => value === (props[name] ?? "default"),
        );
        return isBase
          ? []
          : [
              {
                ...block,
                id: `schema-${example.type}-colors-${index}`,
                props: { ...props, ...colorProps },
              },
            ];
      }),
      ...Object.entries(propSchema).flatMap(([name, spec]) => {
        const baseValue = props[name] ?? spec.default;
        return propValues(spec, baseValue).flatMap((value, index) =>
          value === baseValue
            ? []
            : [
                {
                  ...block,
                  id: `schema-${example.type}-${name}-${index}`,
                  props: { ...block.props, [name]: value },
                },
              ],
        );
      }),
    ];
  }),
  // Plain content covers absent styles (including false boolean styles).
  // Apply one style at a time to both text and link content; code cannot be
  // combined with the other formatting marks.
  ...[{}, ...Object.values(styleExamples)].map(
    (styles, index): PartialBlock => ({
      id: `schema-inline-${index}`,
      type: "paragraph",
      content: [
        { type: "text", text: "Styled text. ", styles },
        {
          type: "link",
          href: inlineExamples.link.href,
          content: [{ type: "text", text: "Styled link", styles }],
        },
      ],
    }),
  ),
  // Inline marks and cell props have separate rendering paths from block
  // colors. Check every palette pair on each path, including linked text.
  ...colorPairs.map((styles, index): PartialBlock => ({
    id: `schema-inline-colors-${index}`,
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `${styles.textColor} on ${styles.backgroundColor}. `,
        styles,
      },
      {
        type: "link",
        href: inlineExamples.link.href,
        content: [{ type: "text", text: "Colored link", styles }],
      },
    ],
  })),
  {
    id: "schema-table-colors",
    type: "table",
    content: {
      type: "tableContent",
      rows: colorPairs.map((props) => ({
        cells: [cell(`${props.textColor} on ${props.backgroundColor}`, props)],
      })),
    },
  },
  // Table structure lives in content, outside the block prop schema. Start
  // without headers/widths and vary each optional field independently.
  ...[
    baseTableContent,
    { ...baseTableContent, headerRows: 1 },
    { ...baseTableContent, headerCols: 1 },
    { ...baseTableContent, columnWidths: [150, undefined] },
    // Cell color pairs are covered above; vary alignment independently here.
    ...defaultBlockSpecs.paragraph.config.propSchema.textAlignment.values
      .filter((textAlignment) => textAlignment !== "left")
      .map((textAlignment) => ({
        ...baseTableContent,
        rows: baseTableContent.rows.map((row, rowIndex) => ({
          cells: row.cells.map((tableCell, columnIndex) =>
            rowIndex === 0 && columnIndex === 0
              ? { ...tableCell, props: { ...tableCell.props, textAlignment } }
              : tableCell,
          ),
        })),
      })),
    // Changing a span also requires removing the cells it occupies to keep
    // the table valid. Cover each optional span independently.
    {
      ...baseTableContent,
      rows: [
        { cells: [cell("Spans columns", { colspan: 2 })] },
        { cells: [cell("Left"), cell("Right")] },
      ],
    },
    {
      ...baseTableContent,
      rows: [
        { cells: [cell("Spans rows", { rowspan: 2 }), cell("Top")] },
        { cells: [cell("Bottom")] },
      ],
    },
  ].map((content, index): PartialBlock => ({
    id: `schema-table-content-${index}`,
    type: "table",
    content,
  })),
];

// Screen-reader tests import the shared helpers and fixtures from this file.
// Register these suites only in the regular browser run.
if (!screenReader) {
  test.describe("keyboard", () => {
    async function focusReadOnlyLinkWithAssertions() {
      const link = page.getByRole("link", {
        name: "Documentation",
        exact: true,
      });
      await expect.element(link).toBeVisible();
      const unfocusedOutline = await commands.readOutline(link.selector);
      for (
        let presses = 0;
        document.activeElement !== link.element();
        presses++
      ) {
        if (presses >= 10) {
          throw new Error(
            "Could not focus the Documentation link after 10 Tab presses",
          );
        }
        await commands.pressKey("Tab");
      }
      await expect.element(link).toHaveFocus();
      await commands.checkFocusOutline(link.selector, unfocusedOutline);
      return link;
    }

    // Firefox skips checkListItem with ArrowDown.
    // Chromium/WebKit reproduction: expand "Toggle heading", place the caret
    // immediately before the C in "Completed task", then press ArrowUp. It lands
    // in "Toggle heading", skipping the visible "Heading child". ArrowUp from
    // the end of "Completed task" works; Firefox passes both caret positions.
    // Confirmed with clicks and keypresses in Docker. The traversal below reaches
    // "Completed task" at offset 0 when returning from the final paragraph.
    // Keep the complete expected route when re-enabling this test.
    test.skip("default schema: arrow keys visit every expanded block in order", async ({
      onTestFinished,
    }) => {
      // Expansion is view state, not a document prop. Make the route deterministic
      // without changing the visual fixtures' default collapsed state.
      for (const id of ["toggleListItem", "toggle-heading"]) {
        const key = `toggle-${id}`;
        const previous = localStorage.getItem(key);
        localStorage.setItem(key, "true");
        onTestFinished(() => {
          if (previous === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, previous);
          }
        });
      }
      const editor = await renderTestEditor(defaultSchemaDocument);
      await commands.pressKey("Tab");
      await expect.element(page.getByRole("textbox")).toHaveFocus();

      function blockIds(blocks: PartialBlock[]): string[] {
        return blocks.flatMap((block) => {
          if (!block.id) {
            throw new Error("Navigation fixture blocks must have explicit IDs");
          }
          return [block.id, ...blockIds(block.children ?? [])];
        });
      }
      const route = blockIds(defaultSchemaDocument);
      // The editor selection also identifies atom blocks (divider/file/media),
      // whose NodeSelection need not have a DOM text selection inside the block.
      expect(editor.getTextCursorPosition().block.id).toBe(route[0]);
      for (const key of ["ArrowDown", "ArrowUp"] as const) {
        const expected = key === "ArrowDown" ? route : route.toReversed();
        let index = 0;
        for (let presses = 0; index < expected.length - 1; presses++) {
          if (presses >= 100) {
            throw new Error(
              `${key} did not finish the document route after 100 presses; still at block "${expected[index]}"`,
            );
          }
          await commands.pressKey(key);
          const actual = editor.getTextCursorPosition().block.id;

          expect(
            [expected[index], expected[index + 1]],
            `${key}: expected ${expected[index]} → ${expected[index + 1]}, got ${actual}`,
          ).toContain(actual);
          const selection = editor.prosemirrorState.selection;
          if (
            actual === expected[index + 1] &&
            (selection instanceof TextSelection ||
              selection instanceof NodeSelection)
          ) {
            index++;
          }
        }
        expect(editor.getTextCursorPosition().block.id).toBe(expected.at(-1));
      }
    });

    test("table: ArrowRight and ArrowLeft visit every cell in row order", async () => {
      await renderTestEditor(tableNavigationDocument);
      await commands.pressKey("Tab");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      const route = [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 1, column: 0 },
        { row: 1, column: 1 },
      ];
      expect((await commands.readSelection()).tableCell).toEqual(route[0]);
      for (const key of ["ArrowRight", "ArrowLeft"] as const) {
        const expected = key === "ArrowRight" ? route : route.toReversed();
        let index = 0;
        for (let presses = 0; index < expected.length - 1; presses++) {
          if (presses >= 100) {
            throw new Error(
              `${key} did not finish the table route after 100 presses; still at cell ${JSON.stringify(expected[index])}`,
            );
          }
          await commands.pressKey(key);
          const { blockId, tableCell } = await commands.readSelection();
          expect(blockId, `${key} stays in the table`).toBe("table");
          expect(
            [expected[index], expected[index + 1]],
            `${key}: cell ${JSON.stringify(expected[index])} → ${JSON.stringify(expected[index + 1])}`,
          ).toContainEqual(tableCell);
          if (
            tableCell?.row === expected[index + 1].row &&
            tableCell?.column === expected[index + 1].column
          ) {
            index++;
          }
        }
      }
    });

    // After Tab enters the second column, Chromium/WebKit's ArrowDown returns
    // to column 0. Firefox preserves the column throughout this sequence.
    test.skipIf(server.browser !== "firefox")(
      "table: ArrowDown and ArrowUp visit each row without changing column",
      async () => {
        await renderTestEditor(tableNavigationDocument);
        await commands.pressKey("Tab");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
        for (const column of [0, 1]) {
          expect((await commands.readSelection()).tableCell).toEqual({
            row: 0,
            column,
          });
          for (const key of ["ArrowDown", "ArrowUp"] as const) {
            const targetRow = key === "ArrowDown" ? 1 : 0;
            let selection = await commands.readSelection();
            for (
              let presses = 0;
              selection.tableCell?.row !== targetRow;
              presses++
            ) {
              if (presses >= 10) {
                throw new Error(
                  `${key} did not reach row ${targetRow}, column ${column} after 10 presses`,
                );
              }
              await commands.pressKey(key);
              selection = await commands.readSelection();
              expect(selection.blockId, `${key} stays in the table`).toBe(
                "table",
              );
              expect(
                selection.tableCell?.column,
                `${key} stays in column ${column}`,
              ).toBe(column);
              expect([0, 1]).toContain(selection.tableCell?.row);
            }
            expect(selection.tableCell).toEqual({ row: targetRow, column });
          }
          if (column === 0) {
            // Set up the second column through the table's keyboard navigation.
            await commands.pressKey("Tab");
          }
        }
      },
    );

    // The editor has no separate focused state without an editing selection; Escape blurs to the body.
    test.skip("editor can receive focus without selecting content", async () => {
      // TODO: Focus the editor as a page element without an editing selection.
      // Tab/arrows should navigate the page; Enter should enter editing.
      // Escape currently blurs to body, which does not preserve this entry point.
    });

    // Whole-block selection requires Cmd+Click; no keyboard interaction is implemented. No styling
    // is present to indicate whole-block selection.
    test.skip("keyboard selection extends to the entire block", async () => {
      // TODO: Extend a text selection to its whole block, leaving neighbours out.
      // Whole-block selection currently requires Cmd+Click; keyboard UX is TBD.
    });

    // TODO: WebKit resets the tab position after Escape blurs the editor, so Tab
    // focuses "Before editor" instead of "After editor".
    test.skipIf(server.browser === "webkit")(
      "Escape allows Tab to leave the editor",
      async () => {
        await renderTestEditor(editorEscapeDocument);
        await commands.pressKey("Tab");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
        await commands.pressKey("Escape");
        await expect.element(document.body).toHaveFocus();
        await commands.pressKey("Tab");
        await expect
          .element(
            page.getByRole("button", { name: "After editor", exact: true }),
          )
          .toHaveFocus();
        // Revisit when the editor can retain focus without an editing selection.
      },
    );

    // Focused inline links do not yet have a suitable visual focus indicator.
    // TODO: Fix the focus appearance before enabling.
    test.skip("read-only editor: Tab reaches inline links and leaves the editor", async () => {
      await renderTestEditor(readOnlyLinkDocument, { editable: false });
      const link = await focusReadOnlyLinkWithAssertions();
      await commands.pressKey("Tab");
      await expect
        .element(
          page.getByRole("button", { name: "After editor", exact: true }),
        )
        .toHaveFocus();
      await commands.pressKey("Shift+Tab");
      await expect.element(link).toHaveFocus();
    });

    // Read-only file/media blocks cannot be selected through the page tab order.
    test.skip("read-only editor: Tab selects blocks that expose a formatting toolbar", async () => {
      // TODO: Open a read-only document containing an image/file block between
      // ordinary paragraphs. Tab from Before editor to select that block, assert
      // the block selection and visible indicator, and continue to After editor.
      // Repeat with Shift+Tab. Static paragraphs should not introduce tab stops.
      // Blocks currently cannot be selected through the page's tab order; do not
      // work around this by clicking or setting the selection through editor APIs.
    });
  });

  test.describe("ARIA", () => {
    // Numbered list item indices are separate text elements, among other issues.
    test.skip("default schema: accessibility tree snapshot", async () => {
      await renderTestEditor(schemaDocument);
      expect(
        await commands.readAriaSnapshot(page.getByRole("textbox").selector),
      ).toMatchSnapshot("default schema");
    });
  });

  test.describe("axe", () => {
    for (const theme of ["light", "dark"] as const) {
      // Known issues include the unnamed editor, unlabeled checklist checkboxes,
      // insufficient contrast, and undersized targets.
      test.skip(`default schema: axe (${theme})`, async ({ annotate }) => {
        await renderTestEditor(schemaDocument, { theme });
        for (const warning of await commands.checkAxe()) {
          await annotate(warning, "warning");
        }
      });
    }
  });

  test.describe("visual", () => {
    function applyStyles(css: string) {
      const style = document.createElement("style");
      style.textContent = css;
      page.getByRole("main").element().append(style);
    }

    // Scaling text takes some logic as the scaling has to be applied to each font
    // size, not just the base editor font size.
    function resizeText(scale: number) {
      function rulesFor(element: Element, selector: string): string {
        const rule =
          element instanceof HTMLElement
            ? `${selector} { font-size: ${Number.parseFloat(getComputedStyle(element).fontSize) * scale}px !important; }`
            : "";
        return [
          rule,
          ...Array.from(element.children, (child, index) =>
            rulesFor(child, `${selector} > :nth-child(${index + 1})`),
          ),
        ].join("\n");
      }

      // Read all sizes before applying overrides, so inherited sizes scale once.
      // A stylesheet avoids ProseMirror reconciling mutations to editable DOM.
      applyStyles(rulesFor(page.getByRole("textbox").element(), ".bn-editor"));
    }

    async function waitForMedia() {
      // Wait for current-frame media data before the tests take screenshots.
      for (const media of document.querySelectorAll("audio, video")) {
        if (media instanceof HTMLMediaElement) {
          media.preload = "auto";
          media.load();
          await expect.poll(() => media.readyState).toBeGreaterThanOrEqual(2);
        }
      }
    }

    test.describe("text spacing and resizing", () => {
      test("default schema remains readable with text spacing overrides", async () => {
        await renderTestEditor(defaultSchemaDocument);
        await waitForMedia();
        // WCAG 1.4.12: override spacing without changing any other style property.
        // https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
        applyStyles(`
      .bn-editor, .bn-editor * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      .bn-editor p { margin-block-end: 2em !important; }
    `);
        await screenshotFull(document.body, "default-schema-text-spacing.png", {
          comparatorOptions: { allowedMismatchedPixels: 10 },
          // Video decoding differs across platforms; keep captions and layout in scope.
          screenshotOptions: {
            mask: [page.elementLocator(document.querySelector("video")!)],
          },
        });
      });

      test("default schema remains readable at 200% text size", async () => {
        await renderTestEditor(defaultSchemaDocument);
        await waitForMedia();
        resizeText(2);
        await screenshotFull(
          document.body,
          "default-schema-text-size-200-percent.png",
          {
            comparatorOptions: { allowedMismatchedPixels: 10 },
            screenshotOptions: {
              mask: [page.elementLocator(document.querySelector("video")!)],
            },
          },
        );
      });
    });
  });
}
