import { BlockSchema } from "@blocknote/core";

import { FormattingToolbarProps } from "./FormattingToolbarPositioner";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import {
  BlockTypeDropdown,
  BlockTypeDropdownItem,
} from "./DefaultDropdowns/BlockTypeDropdown";
import { ToggledStyleButton } from "./DefaultButtons/ToggledStyleButton";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";
import { ReplaceImageButton } from "./DefaultButtons/ReplaceImageButton";
import { ImageCaptionButton } from "./DefaultButtons/ImageCaptionButton";

export const DefaultFormattingToolbar = <BSchema extends BlockSchema>(
  props: FormattingToolbarProps<BSchema> & {
    blockTypeDropdownItems?: BlockTypeDropdownItem[];
  }
) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} items={props.blockTypeDropdownItems} />

      <ImageCaptionButton editor={props.editor} />
      <ReplaceImageButton editor={props.editor} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />

      <TextAlignButton editor={props.editor as any} textAlignment={"left"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"center"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
};
