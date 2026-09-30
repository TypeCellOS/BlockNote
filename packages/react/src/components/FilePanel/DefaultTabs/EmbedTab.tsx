import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  filenameFromURL,
} from "@blocknote/core";
import { ChangeEvent, useCallback, useState } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { FilePanelProps } from "../FilePanelProps.js";

export const EmbedTab = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: FilePanelProps,
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<B, I, S>();

  const block = editor.getBlock(props.blockId);

  const [currentURL, setCurrentURL] = useState<string>("");

  const handleURLChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCurrentURL(event.currentTarget.value);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!editor.getBlock(props.blockId)) {
      return;
    }
    editor.updateBlock(props.blockId, {
      props: {
        name: filenameFromURL(currentURL),
        url: currentURL,
      } as any,
    });
  }, [editor, props.blockId, currentURL]);

  if (!block) {
    return null;
  }

  return (
    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
      {/*
        The visible embed button IS the form's submit control: one commit
        path (the form's `submit` event) whether it is clicked, Enter is
        pressed, or a mobile IME's action key fires — and one labelled
        action for assistive technology.
      */}
      <Components.Generic.Form.Root
        onSubmit={handleSubmit}
        submitButton={
          <Components.FilePanel.Button
            className={"bn-button"}
            type={"submit"}
            data-test="embed-input-button"
          >
            {dict.file_panel.embed.embed_button[block.type] ||
              dict.file_panel.embed.embed_button["file"]}
          </Components.FilePanel.Button>
        }
      >
        <Components.FilePanel.TextInput
          className={"bn-text-input"}
          placeholder={dict.file_panel.embed.url_placeholder}
          value={currentURL}
          onChange={handleURLChange}
          data-test={"embed-input"}
        />
      </Components.Generic.Form.Root>
    </Components.FilePanel.TabPanel>
  );
};
