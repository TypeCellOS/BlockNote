import { callOrReturn, Extension, getExtensionField } from "@tiptap/core";
import { columnResizing, tableEditing } from "prosemirror-tables";
import { TableView } from "prosemirror-tables";
import { Node as PMNode } from "prosemirror-model";
import { mergeCSSClasses } from "../../util/browser.js";

export const TableExtension = Extension.create({
  name: "BlockNoteTableExtension",

  addProseMirrorPlugins: () => {
    class CustomTableView extends TableView {
      constructor(public node: PMNode, public cellMinWidth: number) {
        super(node, cellMinWidth);

        const blockContent = document.createElement("div");
        blockContent.className = mergeCSSClasses(
          "bn-block-content"
          // blockContentHTMLAttributes.class
        );
        blockContent.setAttribute("data-content-type", "table");
        // for (const [attribute, value] of Object.entries(blockContentHTMLAttributes)) {
        //   if (attribute !== "class") {
        //     blockContent.setAttribute(attribute, value);
        //   }
        // }

        const tableWrapper = this.dom;
        blockContent.appendChild(tableWrapper);

        this.dom = blockContent;
      }
    }

    return [
      columnResizing({
        cellMinWidth: 100,
        View: CustomTableView,
      }),
      tableEditing(),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Makes enter create a new line within the cell.
      Enter: () => {
        if (
          this.editor.state.selection.empty &&
          this.editor.state.selection.$head.parent.type.name ===
            "tableParagraph"
        ) {
          this.editor.commands.setHardBreak();

          return true;
        }

        return false;
      },
      // Ensures that backspace won't delete the table if the text cursor is at
      // the start of a cell and the selection is empty.
      Backspace: () => {
        const selection = this.editor.state.selection;
        const selectionIsEmpty = selection.empty;
        const selectionIsAtStartOfNode = selection.$head.parentOffset === 0;
        const selectionIsInTableParagraphNode =
          selection.$head.node().type.name === "tableParagraph";

        return (
          selectionIsEmpty &&
          selectionIsAtStartOfNode &&
          selectionIsInTableParagraphNode
        );
      },
    };
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    };

    return {
      tableRole: callOrReturn(
        getExtensionField(extension, "tableRole", context)
      ),
    };
  },
});
