import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";

import { FilePanelProps } from "../../FilePanelProps";
import { FilePanelTab } from "../FilePanelTab";
import { FilePanelTextInput } from "../FilePanelTextInput";
import { FilePanelButton } from "../FilePanelButton";

export const EmbedTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FilePanelProps<I, S>
) => {
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
          type: "file",
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
      type: "file",
      props: {
        url: currentURL,
      },
    });
  }, [editor, block, currentURL]);

  return (
    <FilePanelTab>
      <FilePanelTextInput
        placeholder={"Enter URL"}
        value={currentURL}
        onChange={handleURLChange}
        onKeyDown={handleURLEnter}
        data-test={"embed-input"}
      />
      <FilePanelButton
        className={"bn-file-panel-button"}
        onClick={handleURLClick}
        data-test={"embed-input-button"}>
        Embed File
      </FilePanelButton>
    </FilePanelTab>
  );
};
