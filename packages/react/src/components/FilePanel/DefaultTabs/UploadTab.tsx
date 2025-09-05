import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { FilePanelProps } from "../FilePanelProps.js";

export const UploadTab = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: FilePanelProps<I, S> & {
    setLoading: (loading: boolean) => void;
  },
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { block, setLoading } = props;

  const editor = useBlockNoteEditor<B, I, S>();

  const [uploadFailed, setUploadFailed] = useState<boolean>(false);

  useEffect(() => {
    if (uploadFailed) {
      setTimeout(() => {
        setUploadFailed(false);
      }, 3000);
    }
  }, [uploadFailed]);

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file === null) {
        return;
      }

      async function upload(file: File) {
        setLoading(true);

        if (editor.uploadFile !== undefined) {
          try {
            let updateData = await editor.uploadFile(file, block.id);
            if (typeof updateData === "string") {
              // received a url
              updateData = {
                props: {
                  name: file.name,
                  url: updateData,
                },
              };
            }
            editor.updateBlock(block, updateData);
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setLoading(false);
          }
        }
      }

      upload(file);
    },
    [block, editor, setLoading],
  );

  const spec = editor.schema.blockSpecs[block.type];
  const accept = spec.implementation.meta?.fileBlockAccept?.length
    ? spec.implementation.meta.fileBlockAccept.join(",")
    : "*/*";

  return (
    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
      <Components.FilePanel.FileInput
        className="bn-file-input"
        data-test="upload-input"
        accept={accept}
        placeholder={
          dict.file_panel.upload.file_placeholder[block.type] ||
          dict.file_panel.upload.file_placeholder["file"]
        }
        value={null}
        onChange={handleFileChange}
      />
      {uploadFailed && (
        <div className="bn-error-text">
          {dict.file_panel.upload.upload_error}
        </div>
      )}
    </Components.FilePanel.TabPanel>
  );
};
