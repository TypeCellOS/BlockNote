import {
  COLORS_DEFAULT,
  defaultBlockSpecs,
  type PartialBlock,
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
import {
  openEditor,
  screenReader,
  readSelection,
  checkAriaSnapshot,
  checkAxe,
  pressKey,
  readOutline,
  checkFocusOutline,
} from "@root/tests/a11y/helpers.js";
import { screenshotFull } from "@root/tests/src/utils/screenshotFull.js";

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
  ...Object.entries(blockExamples).map(([id, block]) => ({ ...block, id })),
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
    children: [{ type: "paragraph", content: "Heading child" }],
  },
  {
    id: "checked",
    type: "checkListItem",
    props: { checked: true },
    content: "Completed task",
  },
  { id: "end", type: "paragraph", content: "End of document" },
];

// Keep navigation identical to navigateDefaultSchemaDocumentWithAssertions.
export async function navigateDefaultSchemaDocument() {
  await pressKey("Tab");

  // Follow the document until its endpoint; an unreachable endpoint times out.
  const visitedTableCells = new Set<string>();
  while (readSelection().blockId !== "end") {
    const { tableCell } = readSelection();
    if (tableCell) {
      visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
    }
    // ArrowDown alone skips columns. Move through cell text and across each
    // row with ArrowRight, then resume ArrowDown from the final cell.
    if (tableCell && visitedTableCells.size < 4) {
      await pressKey("ArrowRight");
    } else {
      await pressKey("ArrowDown");
    }
  }
  while (readSelection().blockId !== "start") {
    await pressKey("ArrowUp");
  }
}

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
    // Same navigation as navigateDefaultSchemaDocument, with selection assertions.
    async function navigateDefaultSchemaDocumentWithAssertions() {
      await pressKey("Tab");
      await expect.element(page.getByRole("textbox")).toHaveFocus();

      // Follow the document until its endpoint; an unreachable endpoint times out.
      const visitedTableCells = new Set<string>();
      while (readSelection().blockId !== "end") {
        const { tableCell } = readSelection();
        if (tableCell) {
          visitedTableCells.add(`${tableCell.row},${tableCell.column}`);
        }
        // ArrowDown alone skips columns. Move through cell text and across each
        // row with ArrowRight, then resume ArrowDown from the final cell.
        if (tableCell && visitedTableCells.size < 4) {
          await pressKey("ArrowRight");
        } else {
          await pressKey("ArrowDown");
        }
      }
      expect(
        [...visitedTableCells].sort(),
        "Every table cell is visited",
      ).toEqual(["0,0", "0,1", "1,0", "1,1"]);
      expect(readSelection().blockId, "Arrow keys reach the final block").toBe(
        "end",
      );
      while (readSelection().blockId !== "start") {
        await pressKey("ArrowUp");
      }
      expect(
        readSelection().blockId,
        "ArrowUp returns to the first block",
      ).toBe("start");
    }

    async function focusReadOnlyLinkWithAssertions() {
      const link = page.getByRole("link", {
        name: "Documentation",
        exact: true,
      });
      await expect.element(link).toBeVisible();
      const unfocusedOutline = readOutline(link.element());
      while (document.activeElement !== link.element()) {
        await pressKey("Tab");
      }
      await expect.element(link).toHaveFocus();
      await checkFocusOutline(link, unfocusedOutline);
      return link;
    }

    test("default schema: arrow-key document navigation", async () => {
      await openEditor(defaultSchemaDocument);
      await navigateDefaultSchemaDocumentWithAssertions();
    });

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
        await openEditor(editorEscapeDocument);
        await pressKey("Tab");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
        await pressKey("Escape");
        await expect.element(document.body).toHaveFocus();
        await pressKey("Tab");
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
      await openEditor(readOnlyLinkDocument, { editable: false });
      const link = await focusReadOnlyLinkWithAssertions();
      await pressKey("Tab");
      await expect
        .element(
          page.getByRole("button", { name: "After editor", exact: true }),
        )
        .toHaveFocus();
      await pressKey("Shift+Tab");
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
      await openEditor(schemaDocument);
      await checkAriaSnapshot(page.getByRole("textbox"), "default schema");
    });
  });

  test.describe("axe", () => {
    for (const theme of ["light", "dark"] as const) {
      // Known issues include the unnamed editor, unlabeled checklist checkboxes,
      // insufficient contrast, and undersized targets.
      test.skip(`default schema: axe (${theme})`, async ({ annotate }) => {
        await openEditor(schemaDocument, { theme });
        await checkAxe(annotate);
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
        await openEditor(defaultSchemaDocument);
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
        await openEditor(defaultSchemaDocument);
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
