import "@blocknote/core/fonts/inter.css";
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
  UnnestBlockButton,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { BlueButton } from "./BlueButton";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
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
            text: "You can now toggle ",
            styles: {},
          },
          {
            type: "text",
            text: "blue",
            styles: { textColor: "blue", backgroundColor: "blue" },
          },
          {
            type: "text",
            text: " and ",
            styles: {},
          },
          {
            type: "text",
            text: "code",
            styles: { code: true },
          },
          {
            type: "text",
            text: " styles with new buttons in the Formatting Toolbar",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
        content: "Select some text to try them out",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={(props) => (
          <FormattingToolbar {...props}>
            <BlockTypeDropdown
              selectedBlocks={props.selectedBlocks}
              key={"blockTypeDropdown"}
            />

            {/* Extra button to toggle blue text & background */}
            <BlueButton key={"customButton"} />

            <ImageCaptionButton
              selectedBlocks={props.selectedBlocks}
              key={"imageCaptionButton"}
            />
            <ReplaceImageButton
              selectedBlocks={props.selectedBlocks}
              key={"replaceImageButton"}
            />

            <BasicTextStyleButton
              selectedBlocks={props.selectedBlocks}
              basicTextStyle={"bold"}
              key={"boldStyleButton"}
            />
            <BasicTextStyleButton
              selectedBlocks={props.selectedBlocks}
              basicTextStyle={"italic"}
              key={"italicStyleButton"}
            />
            <BasicTextStyleButton
              selectedBlocks={props.selectedBlocks}
              basicTextStyle={"underline"}
              key={"underlineStyleButton"}
            />
            <BasicTextStyleButton
              selectedBlocks={props.selectedBlocks}
              basicTextStyle={"strike"}
              key={"strikeStyleButton"}
            />
            {/* Extra button to toggle code styles */}
            <BasicTextStyleButton
              selectedBlocks={props.selectedBlocks}
              key={"codeStyleButton"}
              basicTextStyle={"code"}
            />

            <TextAlignButton
              selectedBlocks={props.selectedBlocks}
              textAlignment={"left"}
              key={"textAlignLeftButton"}
            />
            <TextAlignButton
              selectedBlocks={props.selectedBlocks}
              textAlignment={"center"}
              key={"textAlignCenterButton"}
            />
            <TextAlignButton
              selectedBlocks={props.selectedBlocks}
              textAlignment={"right"}
              key={"textAlignRightButton"}
            />

            <ColorStyleButton
              selectedBlocks={props.selectedBlocks}
              key={"colorStyleButton"}
            />

            <NestBlockButton key={"nestBlockButton"} />
            <UnnestBlockButton key={"unnestBlockButton"} />

            <CreateLinkButton
              selectedBlocks={props.selectedBlocks}
              key={"createLinkButton"}
            />
          </FormattingToolbar>
        )}
      />
    </BlockNoteView>
  );
}
