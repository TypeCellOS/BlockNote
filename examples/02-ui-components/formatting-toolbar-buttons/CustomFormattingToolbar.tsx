import {
  BasicTextStyleButton,
  BlockTypeDropdown,
  ColorStyleButton,
  CreateLinkButton,
  ImageCaptionButton,
  NestBlockButton,
  ReplaceImageButton,
  TextAlignButton,
  Toolbar,
  UnnestBlockButton,
} from "@blocknote/react";
import { CustomButton } from "./CustomButton";
import { BlockNoteEditor } from "@blocknote/core";

export function CustomFormattingToolbar(props: { editor: BlockNoteEditor }) {
  return (
    <Toolbar>
      <BlockTypeDropdown />

      {/*Custom button to toggle blue text & background color.*/}
      <CustomButton editor={props.editor} />

      <ImageCaptionButton />
      <ReplaceImageButton />

      <BasicTextStyleButton basicTextStyle={"bold"} />
      <BasicTextStyleButton basicTextStyle={"italic"} />
      <BasicTextStyleButton basicTextStyle={"underline"} />
      <BasicTextStyleButton basicTextStyle={"strike"} />
      {/* Added code toggle button */}
      <BasicTextStyleButton basicTextStyle={"code"} />

      <TextAlignButton textAlignment={"left"} />
      <TextAlignButton textAlignment={"center"} />
      <TextAlignButton textAlignment={"right"} />

      <ColorStyleButton />

      <NestBlockButton />
      <UnnestBlockButton />

      <CreateLinkButton />
    </Toolbar>
  );
}
