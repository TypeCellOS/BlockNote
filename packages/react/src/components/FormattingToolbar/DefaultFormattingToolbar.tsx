import { Toolbar } from "../../components-shared/Toolbar/Toolbar";
import {
  BlockTypeDropdown,
  BlockTypeDropdownItem,
} from "./DefaultDropdowns/BlockTypeDropdown";
import { ImageCaptionButton } from "./DefaultButtons/ImageCaptionButton";
import { ReplaceImageButton } from "./DefaultButtons/ReplaceImageButton";
import { BasicTextStyleButton } from "./DefaultButtons/BasicTextStyleButton";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";

export const DefaultFormattingToolbar = (props: {
  blockTypeDropdownItems?: BlockTypeDropdownItem[];
}) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} items={props.blockTypeDropdownItems} />

      <ImageCaptionButton />
      <ReplaceImageButton />

      <BasicTextStyleButton basicTextStyle={"bold"} />
      <BasicTextStyleButton basicTextStyle={"italic"} />
      <BasicTextStyleButton basicTextStyle={"underline"} />
      <BasicTextStyleButton basicTextStyle={"strike"} />

      <TextAlignButton textAlignment={"left"} />
      <TextAlignButton textAlignment={"center"} />
      <TextAlignButton textAlignment={"right"} />

      <ColorStyleButton />

      <NestBlockButton />
      <UnnestBlockButton />

      <CreateLinkButton />
    </Toolbar>
  );
};
