import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
} from "@blocknote/react";

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

  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Button
      label="Set Font"
      mainTooltip={"Set Font"}
      icon={<RiText />}
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
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Comic Sans MS",
            styles: {
              font: "Comic Sans MS",
            },
          },
          {
            type: "text",
            text: " <- This text has a different font",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
        content:
          "Highlight some text to open the Formatting Toolbar and change the font elsewhere",
      },
      {
        type: "paragraph",
      },
    ],
  });

  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      {/* Replaces the default Formatting Toolbar. */}
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key={"blockTypeSelect"} />

            <FileCaptionButton key={"fileCaptionButton"} />
            <FileReplaceButton key={"replaceFileButton"} />

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
