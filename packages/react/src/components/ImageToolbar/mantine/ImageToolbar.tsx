import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  Button,
  FileInput,
  LoadingOverlay,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";
import { ImageToolbarProps } from "../ImageToolbarProps";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";

export const ImageToolbar = <
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: ImageToolbarProps<I, S>
) => {
  const editor = useBlockNoteEditor<
    { image: DefaultBlockSchema["image"] },
    I,
    S
  >();

  const [openTab, setOpenTab] = useState<"upload" | "embed">(
    editor.uploadFile !== undefined ? "upload" : "embed"
  );
  const [uploading, setUploading] = useState<boolean>(false);
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
        setUploading(true);

        if (editor.uploadFile !== undefined) {
          try {
            const uploaded = await editor.uploadFile(file);
            editor.updateBlock(props.block, {
              type: "image",
              props: {
                url: uploaded,
              },
            });
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setUploading(false);
          }
        }
      }

      upload(file);
    },
    [editor, props.block]
  );

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
        editor.updateBlock(props.block, {
          type: "image",
          props: {
            url: currentURL,
          },
        });
      }
    },
    [editor, props.block, currentURL]
  );

  const handleURLClick = useCallback(() => {
    editor.updateBlock(props.block, {
      type: "image",
      props: {
        url: currentURL,
      },
    });
  }, [editor, props.block, currentURL]);

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {uploading && <LoadingOverlay visible={uploading} />}

        <Tabs.List>
          {editor.uploadFile !== undefined && (
            <Tabs.Tab value="upload" data-test={"upload-tab"}>
              Upload
            </Tabs.Tab>
          )}
          <Tabs.Tab value="embed" data-test={"embed-tab"}>
            Embed
          </Tabs.Tab>
        </Tabs.List>

        {editor.uploadFile !== undefined && (
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
        )}
        <Tabs.Panel className={"bn-embed-image-panel"} value="embed">
          <div>
            <TextInput
              size={"xs"}
              placeholder={"Enter URL"}
              value={currentURL}
              onChange={handleURLChange}
              onKeyDown={handleURLEnter}
              data-test={"embed-input"}
            />
            <Button
              className={"bn-embed-image-button"}
              onClick={handleURLClick}
              size={"xs"}
              data-test={"embed-input-button"}>
              Embed Image
            </Button>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Toolbar>
  );
};
