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
  BlockTypeDropdown,
  BlockTypeDropdownItem,
} from "./DefaultDropdowns/BlockTypeDropdown";

export const getFormattingToolbarItems = (
  blockTypeDropdownItems?: BlockTypeDropdownItem[]
): JSX.Element[] => [
  <BlockTypeDropdown
    key={"blockTypeDropdown"}
    items={blockTypeDropdownItems}
  />,
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
export const FormattingToolbar = (
  props: FormattingToolbarProps & { children?: ReactNode }
) => {
  return (
    <Toolbar>
      {props.children ||
        getFormattingToolbarItems(props.blockTypeDropdownItems)}
    </Toolbar>
  );
};
