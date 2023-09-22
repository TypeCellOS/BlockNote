import { BlockSchema, PartialBlock } from "@blocknote/core";

import { ImageToolbarProps } from "./ImageToolbarPositioner";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import {
  Button,
  FileInput,
  LoadingOverlay,
  Tabs,
  TextInput,
} from "@mantine/core";

export const DefaultImageToolbar = <BSchema extends BlockSchema>(
  props: ImageToolbarProps<BSchema>
) => {
  const [openTab, setOpenTab] = useState<"upload" | "embed">("upload");
  const [uploading, setUploading] = useState<boolean>(false);

  const handleFileChange = useCallback(
    (file: File) => {
      setUploading(true);
      props.editor.imageUpload(file).then((url) => {
        props.editor.updateBlock(props.block, {
          type: "image",
          props: {
            url: url,
          },
        } as PartialBlock<BSchema>);
        setUploading(false);
      });
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
        } as PartialBlock<BSchema>);
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
    } as PartialBlock<BSchema>);
  }, [currentURL, props.block, props.editor]);

  return (
    <Toolbar
      style={{
        width: "500px",
      }}>
      <Tabs value={openTab} onTabChange={setOpenTab as any}>
        {uploading && <LoadingOverlay visible={uploading} />}

        <Tabs.List>
          <Tabs.Tab value="upload">Upload</Tabs.Tab>
          <Tabs.Tab value="embed">Embed</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="upload">
          <FileInput
            placeholder={"Upload Image"}
            size={"xs"}
            value={null}
            onChange={handleFileChange}
          />
        </Tabs.Panel>
        <Tabs.Panel value="embed">
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
            <TextInput
              size={"xs"}
              placeholder={"Enter URL"}
              value={currentURL}
              onChange={handleURLChange}
              onKeyDown={handleURLEnter}
              style={{ width: "100%" }}
            />
            <Button onClick={handleURLClick} size={"xs"}>
              Embed Image
            </Button>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Toolbar>
  );
};
