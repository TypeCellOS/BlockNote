import { ToolbarWrapper } from "../../../components-shared/Toolbar/ToolbarWrapper";
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

// TODO: This is basically the same as `ToolbarWrapper`, seems pretty useless
export const FormattingToolbar = (
  props: FormattingToolbarProps & { children?: React.ReactNode }
) => {
  return (
    <ToolbarWrapper>
      {props.children || getFormattingToolbarItems()}
    </ToolbarWrapper>
  );
};
