import {
  BlockSchema,
  checkBlockIsDefaultType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo } from "react";
import { RiText } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

export const ImageCaptionButton = () => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  // const [currentEditingCaption, setCurrentEditingCaption] = useState<string>();

  const selectedBlocks = useSelectedBlocks(editor);

  const imageBlock = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (checkBlockIsDefaultType("image", block, editor)) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  // const handleEnter = useCallback(
  //   (event: KeyboardEvent) => {
  //     if (
  //       imageBlock &&
  //       checkDefaultBlockTypeInSchema("image", editor) &&
  //       event.key === "Enter"
  //     ) {
  //       event.preventDefault();
  //       editor.updateBlock(imageBlock, {
  //         type: "image",
  //         props: {
  //           caption: currentEditingCaption,
  //         },
  //       });
  //     }
  //   },
  //   [currentEditingCaption, editor, imageBlock]
  // );
  //
  // const handleChange = useCallback(
  //   (event: ChangeEvent<HTMLInputElement>) =>
  //     setCurrentEditingCaption(event.currentTarget.value),
  //   []
  // );

  if (!imageBlock) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          mainTooltip={"Edit Caption"}
          icon={<RiText />}
          isSelected={imageBlock.props.caption !== ""}
        />
      </Components.Generic.Popover.Trigger>
      {/*<components.PopoverContent>*/}
      {/*  TODO*/}
      {/*  <components.ToolbarInputsMenuItem*/}
      {/*    icon={RiText}*/}
      {/*    value={currentEditingCaption}*/}
      {/*    autoFocus={true}*/}
      {/*    placeholder={"Edit Caption"}*/}
      {/*    onKeyDown={handleEnter}*/}
      {/*    defaultValue={imageBlock.props.caption}*/}
      {/*    onChange={handleChange}*/}
      {/*  />*/}
      {/*</components.PopoverContent>*/}
    </Components.Generic.Popover.Root>
  );
};
