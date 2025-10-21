import { useCallback, useMemo, useState } from "react";
import { RiPenNibFill } from "react-icons/ri";

import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const EditEquationButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const selectedBlocks = useSelectedBlocks(editor);

  const [opened, setOpened] = useState(false);
  const [value, setValue] = useState("");

  const update = useCallback(
    (expression: string) => {
      setValue(expression);
      editor.updateBlock(selectedBlocks[0], {
        type: "math",
        props: {
          expression,
        },
      });
    },
    [editor],
  );
  console.log(selectedBlocks);

  const mathBlock = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (blockHasType(block, editor, "math", { expression: "string" })) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);
  console.log(mathBlock);
  if (!mathBlock || !editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={opened}>
      <Components.Generic.Popover.Trigger>
        {/* TODO: hide tooltip on click */}
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          data-test="editexpression"
          label={"edit math"}
          mainTooltip={"edit math"}
          icon={<RiPenNibFill />}
          onClick={() => setOpened(true)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <div>
          <input
            value={value || mathBlock.props.expression}
            onChange={(e) => {
              update(e.target.value);
            }}
          />
        </div>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
