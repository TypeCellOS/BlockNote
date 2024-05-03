import { Text } from "@mantine/core";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";

import { FilePanelProps } from "../../FilePanelProps";
import { FilePanelTab } from "../FilePanelTab";
import { FilePanelFileInput } from "../FilePanelFileInput";

export const UploadTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: FilePanelProps<I, S> & {
    setLoading: (loading: boolean) => void;
  }
) => {
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

  return editor.uploadFile !== undefined ? (
    <FilePanelTab>
      <FilePanelFileInput
        placeholder={"Upload File"}
        value={null}
        onChange={handleFileChange}
      />
      {uploadFailed && (
        <Text c={"red"} size={"12px"}>
          Error: Upload failed
        </Text>
      )}
    </FilePanelTab>
  ) : null;
};
