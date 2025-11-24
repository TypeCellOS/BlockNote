import { TableHandlesExtension } from "@blocknote/core/extensions";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../../i18n/dictionary.js";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";

export const AddButton = (
  props:
    | { orientation: "row"; side: "above" | "below" }
    | { orientation: "column"; side: "left" | "right" },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const tableHandles = useExtension(TableHandlesExtension);
  const index = useExtensionState(TableHandlesExtension, {
    selector: (state) =>
      props.orientation === "column" ? state?.colIndex : state?.rowIndex,
  });

  if (tableHandles === undefined || index === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        tableHandles.addRowOrColumn(
          index,
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
