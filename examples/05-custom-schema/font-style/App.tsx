import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import {
  BasicTextStyleButton,
  BlockNoteView,
  BlockTypeDropdown,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  ImageCaptionButton,
  NestBlockButton,
  ReplaceImageButton,
  TextAlignButton,
  ToolbarButton,
  UnnestBlockButton,
  useBlockNoteEditor,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { RiText } from "react-icons/ri";

import { Font } from "./Font";

// Our schema with style specs, which contain the configs and implementations for styles
// that we want our editor to use.
const schema = BlockNoteSchema.create({
  styleSpecs: {
    // Adds all default styles.
    ...defaultStyleSpecs,
    // Adds the Font style.
    font: Font,
  },
});

// Formatting Toolbar button to set the font style.
const SetFontStyleButton = () => {
  const editor = useBlockNoteEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >();

  return (
    <ToolbarButton
      mainTooltip={"Set Font"}
      icon={RiText}
      onClick={() => {
        const fontName = prompt("Enter a font name") || "Comic Sans MS";

        editor.addStyles({
          font: fontName,
        });
      }}
    />
  );
};

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
  });

  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      {/* Replaces the default Formatting Toolbar. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeDropdown key={"blockTypeDropdown"} />

            <ImageCaptionButton key={"imageCaptionButton"} />
            <ReplaceImageButton key={"replaceImageButton"} />

            <BasicTextStyleButton
              basicTextStyle={"bold"}
              key={"boldStyleButton"}
            />
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
            {/* Adds SetFontStyleButton */}
            <SetFontStyleButton />

            <TextAlignButton
              textAlignment={"left"}
              key={"textAlignLeftButton"}
            />
            <TextAlignButton
              textAlignment={"center"}
              key={"textAlignCenterButton"}
            />
            <TextAlignButton
              textAlignment={"right"}
              key={"textAlignRightButton"}
            />

            <ColorStyleButton key={"colorStyleButton"} />

            <NestBlockButton key={"nestBlockButton"} />
            <UnnestBlockButton key={"unnestBlockButton"} />

            <CreateLinkButton key={"createLinkButton"} />
          </FormattingToolbar>
        )}
      />
    </BlockNoteView>
  );
}
