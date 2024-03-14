import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";

import { ImagePanelProps } from "../../ImagePanelProps";
import { ImagePanelTab } from "../ImagePanelTab";
import { ImagePanelTextInput } from "../ImagePanelTextInput";
import { ImagePanelButton } from "../ImagePanelButton";

export const EmbedTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImagePanelProps<I, S>
) => {
  const { block } = props;

  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [currentURL, setCurrentURL] = useState<string>("");

  const handleURLChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCurrentURL(event.currentTarget.value);
    },
    []
  );

  const handleURLEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        editor.updateBlock(block, {
          type: "image",
          props: {
            url: currentURL,
          },
        });
      }
    },
    [editor, block, currentURL]
  );

  const handleURLClick = useCallback(() => {
    editor.updateBlock(block, {
      type: "image",
      props: {
        url: currentURL,
      },
    });
  }, [editor, block, currentURL]);

  return (
    <ImagePanelTab>
      <ImagePanelTextInput
        placeholder={"Enter URL"}
        value={currentURL}
        onChange={handleURLChange}
        onKeyDown={handleURLEnter}
        data-test={"embed-input"}
      />
      <ImagePanelButton
        className={"bn-image-panel-button"}
        onClick={handleURLClick}
        data-test={"embed-input-button"}>
        Embed Image
      </ImagePanelButton>
    </ImagePanelTab>
  );
};
