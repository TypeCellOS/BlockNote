import { DOMSerializer, Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import { EMPTY_CELL_WIDTH } from "../../../blocks/index.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { serializeBlocksInternalHTML } from "./util/serializeBlocksInternalHTML.js";

// This is normally handled using decorations in the
// `NumberedListIndexingDecorationPlugin`. This does not run when exporting, so
// we have to add the necessary HTML attributes ourselves.
const addIndexToNumberedListItems = (element: HTMLElement) => {
  const numberedListItems = element.querySelectorAll(
    '[data-content-type="numberedListItem"]',
  );
  numberedListItems.forEach((numberedListItem) => {
    const prevNumberedListItem = numberedListItem
      .closest(".bn-block-outer")
      ?.previousElementSibling?.querySelector(
        '[data-content-type="numberedListItem"]',
      );

    if (!prevNumberedListItem) {
      numberedListItem.setAttribute(
        "data-index",
        numberedListItem.getAttribute("data-start") || "1",
      );
    } else {
      const prevNumberedListItemIndex =
        prevNumberedListItem.getAttribute("data-index");
      numberedListItem.setAttribute(
        "data-index",
        (parseInt(prevNumberedListItemIndex || "0") + 1).toString(),
      );
    }
  });

  return element;
};

// Makes the checkboxes in check list items read-only, as the HTML should be
// static and therefore read-only when rendered.
const makeCheckListItemsReadOnly = (element: HTMLElement) => {
  const checkboxes: NodeListOf<HTMLInputElement> = element.querySelectorAll(
    '[data-content-type="checkListItem"] input',
  );
  checkboxes.forEach((checkbox) => {
    checkbox.disabled = true;
  });

  return element;
};

// Forces toggle blocks (toggle headings, toggle list items) to be expanded.
// This is because event listeners for the toggle button are lost when
// serializing HTML elements to a string, so the button no longer works if the
// HTML string is rendered out.
const forceToggleBlocksShow = (element: HTMLElement) => {
  const hiddenToggleWrappers = element.querySelectorAll(
    '.bn-toggle-wrapper[data-show-children="false"]',
  );
  hiddenToggleWrappers.forEach((toggleWrapper) => {
    toggleWrapper.setAttribute("data-show-children", "true");
  });

  return element;
};

// Adds minimum cell widths, which would normally be done by the
// `columnResizing` extension. This extension doesn't run when exporting to
// HTML, so we have to add this manually.
const addTableMinCellWidths = (element: HTMLElement) => {
  const tables = element.querySelectorAll('[data-content-type="table"] table');
  tables.forEach((table) => {
    table.setAttribute(
      "style",
      `--default-cell-min-width: ${EMPTY_CELL_WIDTH}px;`,
    );
    table.setAttribute("data-show-children", "true");
  });

  return element;
};

// Adds table wrapping elements, which would normally be done by the
// `columnResizing` extension. This extension doesn't run when exporting to
// HTML, so we have to add this manually. This adds the correct padding to
// tables.
const addTableWrappers = (element: HTMLElement) => {
  const tables = element.querySelectorAll('[data-content-type="table"] table');
  tables.forEach((table) => {
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "tableWrapper";
    const tableWrapperInner = document.createElement("div");
    tableWrapperInner.className = "tableWrapper-inner";

    tableWrapper.appendChild(tableWrapperInner);
    table.parentElement?.appendChild(tableWrapper);
    tableWrapper.appendChild(table);
  });

  return element;
};

// Adds trailing breaks to blocks with empty inline content. This is normally
// done by ProseMirror, but only when rendering an actual editor. Without them,
// empty inline content has a height of 0.
const addTrailingBreakToEmptyInlineContent = (element: HTMLElement) => {
  const emptyInlineContent = element.querySelectorAll(
    ".bn-inline-content:empty",
  );
  emptyInlineContent.forEach((inlineContent) => {
    // We actually use a `span` instead of a `br` to avoid potential false
    // positives when parsing.
    const trailingBreak = document.createElement("span");
    trailingBreak.className = "ProseMirror-trailingBreak";
    trailingBreak.setAttribute("style", "display: inline-block;");

    inlineContent.appendChild(trailingBreak);
  });

  return element;
};

// Used to serialize BlockNote blocks and ProseMirror nodes to HTML without
// losing data. Blocks are exported using the `toInternalHTML` method in their
// `blockSpec`.
//
// The HTML created by this serializer is the same as what's rendered by the
// editor to the DOM. This means that it retains the same structure as the
// editor, including the `blockGroup` and `blockContainer` wrappers. This also
// means that it can be converted back to the original blocks without any data
// loss.
export const createInternalHTMLSerializer = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
) => {
  const serializer = DOMSerializer.fromSchema(schema);

  // Set of transforms to run on the output HTML element after serializing
  // blocks. These are used to add HTML elements, attributes, or class names
  // which would normally be done by extensions and plugins. Since these don't
  // run when converting blocks to HTML, tranforms are used to mock their
  // functionality so that the rendered HTML looks identical to that of a live
  // editor.
  const transforms: ((element: HTMLElement) => HTMLElement)[] = [
    addIndexToNumberedListItems,
    makeCheckListItemsReadOnly,
    forceToggleBlocksShow,
    addTableMinCellWidths,
    addTableWrappers,
    addTrailingBreakToEmptyInlineContent,
  ];

  return {
    serializeBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document },
    ) => {
      let element = serializeBlocksInternalHTML(
        editor,
        blocks,
        serializer,
        options,
      );

      for (const transform of transforms) {
        element = transform(element);
      }

      return element.outerHTML;
    },
  };
};
