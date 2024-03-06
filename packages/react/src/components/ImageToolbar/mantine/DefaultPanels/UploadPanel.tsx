import { FileInput, Tabs, Text } from "@mantine/core";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";
import { ImageToolbarProps } from "../../ImageToolbarProps";

export const UploadPanel = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImageToolbarProps<I, S> & {
    setLoading: (loading: boolean) => void;
  }
) => {
  const { block, setLoading } = props;

  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
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
              type: "image",
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
    <Tabs.Panel className={"bn-upload-image-panel"} value="upload">
      <div>
        <FileInput
          placeholder={"Upload Image"}
          size={"xs"}
          value={null}
          onChange={handleFileChange}
          data-test={"upload-input"}
        />
        {uploadFailed && (
          <Text c={"red"} size={"12px"}>
            Error: Upload failed
          </Text>
        )}
      </div>
    </Tabs.Panel>
  ) : null;
};
