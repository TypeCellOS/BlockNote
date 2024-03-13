import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { FormattingToolbarProps } from "../FormattingToolbarProps";
import { BasicTextStyleButton } from "./DefaultButtons/BasicTextStyleButton";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";
import { ImageCaptionButton } from "./DefaultButtons/ImageCaptionButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { ReplaceImageButton } from "./DefaultButtons/ReplaceImageButton";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import {
  BlockTypeDropdown,
  BlockTypeDropdownItem,
} from "./DefaultDropdowns/BlockTypeDropdown";
import {
  Block,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export const getFormattingToolbarItems = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  selectedBlocks: Block<BSchema, I, S>[],
  blockTypeDropdownItems?: BlockTypeDropdownItem[]
): JSX.Element[] => [
  <BlockTypeDropdown
    selectedBlocks={selectedBlocks}
    items={blockTypeDropdownItems}
    key={"blockTypeDropdown"}
  />,
  <ImageCaptionButton
    selectedBlocks={selectedBlocks}
    key={"imageCaptionButton"}
  />,
  <ReplaceImageButton
    selectedBlocks={selectedBlocks}
    key={"replaceImageButton"}
  />,
  <BasicTextStyleButton
    selectedBlocks={selectedBlocks}
    basicTextStyle={"bold"}
    key={"boldStyleButton"}
  />,
  <BasicTextStyleButton
    selectedBlocks={selectedBlocks}
    basicTextStyle={"italic"}
    key={"italicStyleButton"}
  />,
  <BasicTextStyleButton
    selectedBlocks={selectedBlocks}
    basicTextStyle={"underline"}
    key={"underlineStyleButton"}
  />,
  <BasicTextStyleButton
    selectedBlocks={selectedBlocks}
    basicTextStyle={"strike"}
    key={"strikeStyleButton"}
  />,
  <TextAlignButton
    selectedBlocks={selectedBlocks}
    textAlignment={"left"}
    key={"textAlignLeftButton"}
  />,
  <TextAlignButton
    selectedBlocks={selectedBlocks}
    textAlignment={"center"}
    key={"textAlignCenterButton"}
  />,
  <TextAlignButton
    selectedBlocks={selectedBlocks}
    textAlignment={"right"}
    key={"textAlignRightButton"}
  />,
  <ColorStyleButton selectedBlocks={selectedBlocks} key={"colorStyleButton"} />,
  <NestBlockButton key={"nestBlockButton"} />,
  <UnnestBlockButton key={"unnestBlockButton"} />,
  <CreateLinkButton selectedBlocks={selectedBlocks} key={"createLinkButton"} />,
];

// TODO: props.blockTypeDropdownItems should only be available if no children
//  are passed
/**
 * By default, the FormattingToolbar component will render with default
 * dropdowns/buttons. However, you can override the dropdowns/buttons to render
 * by passing children. The children you pass should be:
 *
 * - Default dropdowns: Components found within the `/DefaultDropdowns` directory.
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom dropdowns: The `ToolbarDropdown` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export const FormattingToolbar = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FormattingToolbarProps<BSchema, I, S> & { children?: React.ReactNode }
) => {
  return (
    <Toolbar>
      {props.children ||
        getFormattingToolbarItems(
          props.selectedBlocks,
          props.blockTypeDropdownItems
        )}
    </Toolbar>
  );
};
