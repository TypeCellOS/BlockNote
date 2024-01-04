import { BlockSchema, PartialBlock } from "@blocknote/core";

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
import { Toolbar } from "../../components-shared/Toolbar/Toolbar";
import type { ImageToolbarProps } from "./ImageToolbarPositioner";

export const DefaultImageToolbar = <BSchema extends BlockSchema>(
  props: ImageToolbarProps<BSchema, any>
) => {
  const [openTab, setOpenTab] = useState<"upload" | "embed">(
    props.editor.uploadFile !== undefined ? "upload" : "embed"
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

        if (props.editor.uploadFile !== undefined) {
          try {
            const uploaded = await props.editor.uploadFile(file);
            props.editor.updateBlock(props.block, {
              type: "image",
              props: {
                url: uploaded,
              },
            } as PartialBlock<BSchema, any, any>);
          } catch (e) {
            setUploadFailed(true);
          } finally {
            setUploading(false);
          }
        }
      }

      upload(file);
    },
    [props.block, props.editor]
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
        props.editor.updateBlock(props.block, {
          type: "image",
          props: {
            url: currentURL,
          },
        } as PartialBlock<BSchema, any, any>);
      }
    },
    [currentURL, props.block, props.editor]
  );

  const handleURLClick = useCallback(() => {
    props.editor.updateBlock(props.block, {
      type: "image",
      props: {
        url: currentURL,
      },
    } as PartialBlock<BSchema, any, any>);
  }, [currentURL, props.block, props.editor]);

  return (
    <Toolbar className={"bn-image-toolbar"}>
      <Tabs value={openTab} onChange={setOpenTab as any}>
        {uploading && <LoadingOverlay visible={uploading} />}

        <Tabs.List>
          {props.editor.uploadFile !== undefined && (
            <Tabs.Tab value="upload" data-test={"upload-tab"}>
              Upload
            </Tabs.Tab>
          )}
          <Tabs.Tab value="embed" data-test={"embed-tab"}>
            Embed
          </Tabs.Tab>
        </Tabs.List>

        {props.editor.uploadFile !== undefined && (
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
