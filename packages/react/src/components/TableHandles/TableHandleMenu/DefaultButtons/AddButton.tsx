import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import { TableHandleMenuProps } from "../TableHandleMenuProps.js";

export const AddButton = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: TableHandleMenuProps<I, S> &
    (
      | { orientation: "row"; side: "above" | "below" }
      | { orientation: "column"; side: "left" | "right" }
    ),
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<
    { table: DefaultBlockSchema["table"] },
    I,
    S
  >();

  const tableHandles = editor.tableHandles;

  if (!tableHandles) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        tableHandles.addRowOrColumn(
          props.index,
          props.orientation === "row"
            ? { orientation: "row", side: props.side }
            : { orientation: "column", side: props.side },
        );
      }}
    >
      {dict.table_handle[`add_${props.side}_menuitem`]}
    </Components.Generic.Menu.Item>
  );
};
