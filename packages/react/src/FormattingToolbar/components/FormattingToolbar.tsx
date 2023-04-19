import { FC } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { BlockTypeDropdown } from "./DefaultDropdowns/BlockTypeDropdown";
import { ToggledStyleButton } from "./DefaultButtons/ToggledStyleButton";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton";
import { ColorStyleButton } from "./DefaultButtons/ColorStyleButton";
import {
  NestBlockButton,
  UnnestBlockButton,
} from "./DefaultButtons/NestBlockButtons";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton";

export const FormattingToolbar: FC<{ editor: BlockNoteEditor }> = (props: {
  editor: BlockNoteEditor;
}) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />

      <TextAlignButton editor={props.editor} textAlignment={"left"} />
      <TextAlignButton editor={props.editor} textAlignment={"center"} />
      <TextAlignButton editor={props.editor} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
};
