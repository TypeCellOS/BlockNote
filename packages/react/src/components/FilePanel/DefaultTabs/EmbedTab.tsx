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

  const embedURL = useCallback(() => {
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
        The embed button below is this form's submit control, so `Form.Root`
        must not add its own — a screen reader would announce two separate
        actions for the one thing this panel does. It stays outside the
        `<form>` on purpose: the skins disagree on whether their panel button
        defaults to `type="submit"`, so inside one it would fire `onClick`
        *and* submit, embedding twice.
      */}
      <Components.Generic.Form.Root onSubmit={embedURL} omitSubmitButton>
        <Components.FilePanel.TextInput
          className={"bn-text-input"}
          placeholder={dict.file_panel.embed.url_placeholder}
          value={currentURL}
          onChange={handleURLChange}
          data-test={"embed-input"}
        />
      </Components.Generic.Form.Root>
      <Components.FilePanel.Button
        className={"bn-button"}
        onClick={embedURL}
        data-test="embed-input-button"
      >
        {dict.file_panel.embed.embed_button[block.type] ||
          dict.file_panel.embed.embed_button["file"]}
      </Components.FilePanel.Button>
    </Components.FilePanel.TabPanel>
  );
};
