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

import { ImagePanelProps } from "../../ImagePanelProps";
import { ImagePanelTab } from "../ImagePanelTab";
import { ImagePanelFileInput } from "../ImagePanelFileInput";

export const UploadTab = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImagePanelProps<I, S> & {
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
    <ImagePanelTab>
      <ImagePanelFileInput
        placeholder={"Upload Image"}
        value={null}
        onChange={handleFileChange}
      />
      {uploadFailed && (
        <Text c={"red"} size={"12px"}>
          Error: Upload failed
        </Text>
      )}
    </ImagePanelTab>
  ) : null;
};
