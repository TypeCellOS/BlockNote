import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";

import { ImageToolbarProps } from "../../ImageToolbarProps";
import { ImageToolbarPanel } from "../ImageToolbarPanel";
import { ImageToolbarTextInput } from "../ImageToolbarTextInput";
import { ImageToolbarButton } from "../ImageToolbarButton";

export const EmbedPanel = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImageToolbarProps<I, S>
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
    <ImageToolbarPanel>
      <ImageToolbarTextInput
        placeholder={"Enter URL"}
        value={currentURL}
        onChange={handleURLChange}
        onKeyDown={handleURLEnter}
        data-test={"embed-input"}
      />
      <ImageToolbarButton
        className={"bn-image-toolbar-button"}
        onClick={handleURLClick}
        data-test={"embed-input-button"}>
        Embed Image
      </ImageToolbarButton>
    </ImageToolbarPanel>
  );
};
