import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { ImagePanelProps } from "../ImagePanelProps";

export const EmbedTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImagePanelProps<I, S>
) => {
  const Components = useComponentsContext()!;

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
    <Components.ImagePanel.TabPanel className={"bn-tab-panel"}>
      <Components.ImagePanel.TextInput
        className={"bn-text-input"}
        placeholder={"Enter URL"}
        value={currentURL}
        onChange={handleURLChange}
        onKeyDown={handleURLEnter}
        data-test={"embed-input"}
      />
      <Components.ImagePanel.Button
        className={"bn-button"}
        onClick={handleURLClick}
        data-test="embed-input-button">
        Embed Image
      </Components.ImagePanel.Button>
    </Components.ImagePanel.TabPanel>
  );
};
