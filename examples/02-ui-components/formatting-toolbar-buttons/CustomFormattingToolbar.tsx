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

import { CustomButton } from "./CustomButton";

export function CustomFormattingToolbar() {
  return (
    <FormattingToolbar>
      <BlockTypeDropdown key={"blockTypeDropdown"} />

      <CustomButton key={"customButton"} />

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
