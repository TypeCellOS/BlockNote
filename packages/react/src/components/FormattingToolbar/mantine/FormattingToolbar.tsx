import { ReactNode } from "react";

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
  BlockTypeSelect,
  BlockTypeSelectItem,
} from "./DefaultSelects/BlockTypeSelect";

export const getFormattingToolbarItems = (
  blockTypeSelectItems?: BlockTypeSelectItem[]
): JSX.Element[] => [
  <BlockTypeSelect key={"blockTypeSelect"} items={blockTypeSelectItems} />,
  <ImageCaptionButton key={"imageCaptionButton"} />,
  <ReplaceImageButton key={"replaceImageButton"} />,
  <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />,
  <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />,
  <BasicTextStyleButton
    basicTextStyle={"underline"}
    key={"underlineStyleButton"}
  />,
  <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />,
  <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />,
  <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />,
  <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />,
  <ColorStyleButton key={"colorStyleButton"} />,
  <NestBlockButton key={"nestBlockButton"} />,
  <UnnestBlockButton key={"unnestBlockButton"} />,
  <CreateLinkButton key={"createLinkButton"} />,
];

// TODO: props.blockTypeSelectItems should only be available if no children
//  are passed
/**
 * By default, the FormattingToolbar component will render with default
 * selects/buttons. However, you can override the selects/buttons to render
 * by passing children. The children you pass should be:
 *
 * - Default selects: Components found within the `/DefaultSelects` directory.
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export const FormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode }
) => {
  return (
    <Toolbar>
      {props.children || getFormattingToolbarItems(props.blockTypeSelectItems)}
    </Toolbar>
  );
};
