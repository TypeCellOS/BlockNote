import {
  BasicTextStyleButton,
  BlockTypeDropdown,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  ImageCaptionButton,
  NestBlockButton,
  ReplaceImageButton,
  TextAlignButton,
  UnnestBlockButton,
} from "@blocknote/react";

import { BlueButton } from "./BlueButton";

export function CustomFormattingToolbar() {
  return (
    <FormattingToolbar>
      <BlockTypeDropdown key={"blockTypeDropdown"} />

      {/* extra button specific to our CustomFormattingToolbar */}
      <BlueButton key={"customButton"} />

      <ImageCaptionButton key={"imageCaptionButton"} />
      <ReplaceImageButton key={"replaceImageButton"} />

      <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
      <BasicTextStyleButton
        basicTextStyle={"italic"}
        key={"italicStyleButton"}
      />
      <BasicTextStyleButton
        basicTextStyle={"underline"}
        key={"underlineStyleButton"}
      />
      <BasicTextStyleButton
        basicTextStyle={"strike"}
        key={"strikeStyleButton"}
      />

      {/* extra code style button specific to our CustomFormattingToolbar */}
      <BasicTextStyleButton key={"codeStyleButton"} basicTextStyle={"code"} />

      <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
      <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
      <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />

      <ColorStyleButton key={"colorStyleButton"} />

      <NestBlockButton key={"nestBlockButton"} />
      <UnnestBlockButton key={"unnestBlockButton"} />

      <CreateLinkButton key={"createLinkButton"} />
    </FormattingToolbar>
  );
}
