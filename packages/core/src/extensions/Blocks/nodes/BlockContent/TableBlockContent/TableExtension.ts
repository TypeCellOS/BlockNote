import { Extension, callOrReturn, getExtensionField } from "@tiptap/core";
import { columnResizing, tableEditing } from "prosemirror-tables";

export const TableExtension = Extension.create({
  name: "BlockNoteTableExtension",

  addProseMirrorPlugins: () => {
    return [
      columnResizing({
        cellMinWidth: 100,
      }),
      tableEditing(),
    ];
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
