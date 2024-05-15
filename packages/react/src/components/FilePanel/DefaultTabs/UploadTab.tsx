import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";


import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { FilePanelProps } from "../FilePanelProps";

export const UploadTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FilePanelProps<I, S> & {
    setLoading: (loading: boolean) => void;
  }
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { block, setLoading } = props;

  const editor = useBlockNoteEditor<
    { file: DefaultBlockSchema["file"] },
    I,
    S
  >();

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
            const uploaded = await editor.uploadFile(file);
            editor.updateBlock(block, {
              type: "file",
              props: {
                fileType: file.type.split("/")[0],
                url: uploaded,
              },
            });
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setLoading(false);
          }
        }
      }

      upload(file);
    },
    [block, editor, setLoading]
  );
  
  return (
    <Components.FilePanel.TabPanel className={"bn-tab-panel"}>
      <Components.FilePanel.FileInput
        className="bn-file-input"
        data-test="upload-input"
        accept={props.block.props.fileType + "/*"}
        placeholder={dict.file_panel.upload.file_placeholder}
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
