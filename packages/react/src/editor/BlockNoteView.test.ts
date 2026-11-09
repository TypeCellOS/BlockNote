import {
  COLORS_DEFAULT,
  defaultBlockSpecs,
  type PartialBlock,
  type PartialTableCell,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type PropSchema,
} from "@blocknote/core";
import {
  navigateDefaultSchemaDocument,
  focusReadOnlyLink,
} from "./testHelpers.js";
import {
  defaultSchemaDocument,
  blockExamples,
} from "@root/tests/a11y/documents.js";
import { expect, test } from "vite-plus/test";
import { page, server } from "vite-plus/test/browser";
import {
  openEditor,
  readSelection,
  checkAriaSnapshot,
  checkAxe,
  pressKey,
  readOutline,
  checkFocusOutline,
} from "@root/tests/a11y/helpers.js";
import { screenshotFull } from "@root/tests/src/utils/screenshotFull.js";

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

const colors = ["default", ...Object.keys(COLORS_DEFAULT)];

// Cover each finite prop value, rather than the Cartesian product of all block
// props. Open-ended strings and numbers use representative values.
function propValues(
  name: string,
  spec: PropSchema[string],
  baseValue: string | number | boolean | undefined,
) {
  if (spec.values) {
    return spec.values;
  }
  if (typeof spec.default === "boolean") {
    return [false, true];
  }
  switch (name) {
    case "textColor":
    case "backgroundColor":
      return colors;
    case "name":
    case "caption":
      return [
        "",
        typeof baseValue === "string" && baseValue !== ""
          ? baseValue
          : "Example text",
      ];
    case "url":
      return [""]; // The populated URL is supplied by blockExamples.
    case "previewWidth":
      return [undefined, 100, 300];
    case "start":
      return [undefined, 1, 3];
    case "language":
      return ["text", "javascript"];
    default:
      throw new Error(`Add axe fixture values for block prop ${name}`);
  }
}

// The first block exposing a prop covers its variants for all block types.
const coveredBlockProps = new Set<string>();

const blocksDocument: PartialBlock[] = [
  { id: "axe-placeholder", type: "paragraph", content: "" },
  ...Object.values(blockExamples).flatMap((example): PartialBlock[] => {
    const block: PartialBlock = example;
    const props: Record<string, string | number | boolean | undefined> =
      block.props ?? {};
    return [
      { ...block, id: `axe-${example.type}-default` },
      ...Object.entries(
        defaultBlockSpecs[example.type].config.propSchema,
      ).flatMap(([name, spec]) => {
        if (coveredBlockProps.has(name)) {
          return [];
        }
        coveredBlockProps.add(name);
        const baseValue = props[name] ?? spec.default;
        return propValues(name, spec, baseValue).flatMap((value, index) => {
          if ((value ?? spec.default) === baseValue) {
            return [];
          }
          return [
            {
              ...block,
              id: `axe-${example.type}-${name}-${index}`,
              props: { ...block.props, [name]: value },
            },
          ];
        });
      }),
    ];
  }),
  {
    id: "axe-nested",
    type: "paragraph",
    content: "Parent paragraph",
    children: [
      {
        id: "axe-nested-bullet",
        type: "bulletListItem",
        content: "Nested bullet",
        children: [
          {
            id: "axe-nested-numbered",
            type: "numberedListItem",
            content: "Nested numbered item",
            children: [
              {
                id: "axe-nested-task",
                type: "checkListItem",
                content: "Nested task",
              },
            ],
          },
        ],
      },
    ],
  },
  ...(["heading", "toggleListItem"] as const).flatMap((type): PartialBlock[] =>
    [false, true].flatMap((expanded) =>
      [false, true].map((hasChildren): PartialBlock => ({
        id: `axe-${type}-${expanded}-${hasChildren}`,
        ...(type === "heading"
          ? { type, props: { isToggleable: true } }
          : { type }),
        content: `${type} ${expanded ? "expanded" : "collapsed"} ${hasChildren ? "with children" : "empty"}`,
        children: hasChildren
          ? [
              {
                id: `axe-${type}-${expanded}-${hasChildren}-child`,
                type: "paragraph",
                content: "Toggle child",
              },
            ]
          : [],
      })),
    ),
  ),
];

const inlineContentDocument: PartialBlock[] = colors.flatMap((textColor) =>
  colors.map((backgroundColor) => ({
    id: `axe-inline-${textColor}-${backgroundColor}`,
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `${textColor} on ${backgroundColor}. `,
        styles: { textColor, backgroundColor },
      },
      {
        type: "link",
        href: "https://www.blocknotejs.org/",
        content: [
          {
            type: "text",
            text: "Linked text",
            styles: { textColor, backgroundColor },
          },
        ],
      },
    ],
  })),
);

type Cell = PartialTableCell<DefaultInlineContentSchema, DefaultStyleSchema>;
function cell(content: string, props: Cell["props"] = {}): Cell {
  return { type: "tableCell", content, props };
}

const tablesDocument: PartialBlock[] = [
  ...(
    [
      { headerRows: 1 },
      { headerCols: 1 },
      { headerRows: 1, headerCols: 1 },
    ] as const
  ).map((headers, index): PartialBlock => ({
    id: `axe-table-headers-${index}`,
    type: "table",
    content: {
      type: "tableContent",
      ...headers,
      rows: [
        { cells: ["Region", "Sales", "Costs"] },
        { cells: ["North", "100", "50"] },
        { cells: ["South", "200", "80"] },
      ],
    },
  })),
  {
    id: "axe-table-merged",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      headerCols: 1,
      rows: [
        {
          cells: [
            cell("Region"),
            cell("Quarter totals", { colspan: 2 }),
            cell("Notes"),
          ],
        },
        {
          cells: [
            cell("North", { rowspan: 2 }),
            cell("Combined total", { colspan: 2, rowspan: 2 }),
            cell("First period"),
          ],
        },
        { cells: [cell("Second period")] },
        {
          cells: [
            cell("South"),
            cell("100"),
            cell("200"),
            cell("Final period"),
          ],
        },
      ],
    },
  },
  // Cell props use a different rendering path from inline marks. Exercise that
  // path without repeating the full inline foreground/background matrix.
  {
    id: "axe-table-colors",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: ["Color", "Cell text", "Cell background"] },
        ...colors.map((color) => ({
          cells: [
            cell(color),
            cell("Colored text", { textColor: color }),
            cell("Highlighted cell", { backgroundColor: color }),
          ],
        })),
      ],
    },
  },
];

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
    expect(readSelection().blockId, "ArrowUp returns to the first block").toBe(
      "start",
    );
  }

  async function focusReadOnlyLinkWithAssertions() {
    const link = page.getByRole("link", { name: "Documentation", exact: true });
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

  // Whole-block selection requires Cmd+Click; no keyboard interaction is implemented.
  test.skip("keyboard selection extends to the entire block", async () => {
    // TODO: Extend a text selection to its whole block, leaving neighbours out.
    // Whole-block selection currently requires Cmd+Click; keyboard UX is TBD.
  });

  // The keyboard whole-block selection needed to capture its visual indicator is not implemented.
  test.skip("whole-block selection is visible", async () => {
    // TODO: Once keyboard block selection exists, snapshot its visual indicator.
    // TODO: Text selection, whole-document selection, and non-inline blocks.
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
      .element(page.getByRole("button", { name: "After editor", exact: true }))
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
  test("default schema: arrow-key document navigation", async () => {
    await openEditor(defaultSchemaDocument);
    await navigateDefaultSchemaDocument();
    await checkAriaSnapshot(page.getByRole("textbox"), "default schema");
  });

  test("read-only editor: Tab reaches inline links and leaves the editor", async () => {
    await openEditor(readOnlyLinkDocument, { editable: false });
    await focusReadOnlyLink();
    await checkAriaSnapshot(page.getByRole("textbox"), "read-only editor");
  });
});

test.describe("axe", () => {
  for (const theme of ["light", "dark"] as const) {
    // Axe reports an unnamed editor textbox, unlabeled checklist checkboxes, and insufficient color contrast.
    test.skip(`default schema blocks: axe (${theme})`, async ({ annotate }) => {
      for (const block of blocksDocument) {
        if (
          block.id?.startsWith("axe-heading-") ||
          block.id?.startsWith("axe-toggleListItem-")
        ) {
          localStorage.setItem(
            `toggle-${block.id}`,
            String(block.id.includes("-true-")),
          );
        }
      }
      await openEditor(blocksDocument, { theme });
      await pressKey("Tab");
      await expect.poll(() => readSelection().blockId).toBe("axe-placeholder");
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      await checkAxe(annotate);
    });

    // Axe reports an unnamed editor textbox and insufficient color contrast.
    test.skip(`default inline content and colors: axe (${theme})`, async ({
      annotate,
    }) => {
      await openEditor(inlineContentDocument, { theme });
      await checkAxe(annotate);
    });

    // Axe reports an unnamed editor textbox, insufficient contrast, and an undersized "After editor" fixture button.
    test.skip(`tables: axe (${theme})`, async ({ annotate }) => {
      await openEditor(tablesDocument, { theme });
      const header = page
        .getByText("Quarter totals", { exact: true })
        .element()
        .closest("th");
      expect(header?.getAttribute("colspan")).toBe("2");
      const mergedCell = page
        .getByText("Combined total", { exact: true })
        .element()
        .closest("td");
      expect(mergedCell?.getAttribute("colspan")).toBe("2");
      expect(mergedCell?.getAttribute("rowspan")).toBe("2");
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
