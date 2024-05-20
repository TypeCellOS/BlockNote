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
import { useDictionary } from "../../../i18n/dictionary";
import { FilePanelProps } from "../FilePanelProps";

export const EmbedTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FilePanelProps<I, S>
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { block } = props;

  const editor = useBlockNoteEditor<
    { file: DefaultBlockSchema["file"] },
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
          props: {
            name: currentURL.split("/")[-1],
            url: currentURL,
          },
        });
      }
    },
    [editor, block, currentURL]
  );

  const handleURLClick = useCallback(() => {
    editor.updateBlock(block, {
      props: {
        name: currentURL.split("/")[-1],
        url: currentURL,
      },
    });
  }, [editor, block, currentURL]);

  return (
    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
      <Components.FilePanel.TextInput
        className={"bn-text-input"}
        placeholder={dict.file_panel.embed.url_placeholder}
        value={currentURL}
        onChange={handleURLChange}
        onKeyDown={handleURLEnter}
        data-test={"embed-input"}
      />
      <Components.FilePanel.Button
        className={"bn-button"}
        onClick={handleURLClick}
        data-test="embed-input-button">
        {dict.file_panel.embed.embed_button}
      </Components.FilePanel.Button>
    </Components.FilePanel.TabPanel>
  );
};
