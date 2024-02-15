import {
  BlockTypeDropdown,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbarProps,
  ImageCaptionButton,
  NestBlockButton,
  ReplaceImageButton,
  TextAlignButton,
  ToggledStyleButton,
  Toolbar,
  UnnestBlockButton,
} from "@blocknote/react";
import { CustomButton } from "./CustomButton";

export function CustomFormattingToolbar(props: FormattingToolbarProps<any>) {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      {/*Custom button to toggle blue text & background color.*/}
      <CustomButton editor={props.editor} />

      <ImageCaptionButton editor={props.editor} />
      <ReplaceImageButton editor={props.editor} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />
      {/* Added code toggle button */}
      <ToggledStyleButton editor={props.editor} toggledStyle={"code"} />

      <TextAlignButton editor={props.editor as any} textAlignment={"left"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"center"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
}
