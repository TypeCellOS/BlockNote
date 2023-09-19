import { BlockSchema, PartialBlock } from "@blocknote/core";

import { ImageToolbarProps } from "./ImageToolbarPositioner";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { FileInput, Stack, TextInput } from "@mantine/core";

export const DefaultImageToolbar = <BSchema extends BlockSchema>(
  props: ImageToolbarProps<BSchema>
) => {
  const [openTab, setOpenTab] = useState<"upload" | "embed">("upload");

  const handleFileChange = useCallback(
    (file: File) => {
      props.editor.imageUpload(file).then((src) =>
        props.editor.updateBlock(props.block, {
          type: "image",
          props: {
            src: src,
          },
        } as PartialBlock<BSchema>)
      );
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
            src: currentURL,
          },
        } as PartialBlock<BSchema>);
      }
    },
    [currentURL, props.block, props.editor]
  );

  // TODO: Necessary?
  const handleURLPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      props.editor.updateBlock(props.block, {
        type: "image",
        props: {
          src: event.clipboardData!.getData("text/plain"),
        },
      } as PartialBlock<BSchema>);
    },
    [props.block, props.editor]
  );

  const Input = useMemo(
    () => () => {
      switch (openTab) {
        case "upload":
          return (
            <FileInput
              placeholder={"Upload Image"}
              size={"xs"}
              value={null}
              onChange={handleFileChange}
            />
          );
        case "embed":
          return (
            <TextInput
              size={"xs"}
              placeholder={"Enter URL"}
              value={currentURL}
              onChange={handleURLChange}
              onKeyDown={handleURLEnter}
              onPaste={handleURLPaste}
            />
          );
        default:
          return null;
      }
    },
    [
      currentURL,
      handleFileChange,
      handleURLChange,
      handleURLEnter,
      handleURLPaste,
      openTab,
    ]
  );

  return (
    <Toolbar
      style={{
        width: "300px",
      }}>
      <Stack spacing={"xs"} m={6} w={"100%"}>
        <Toolbar>
          <ToolbarButton
            mainTooltip={"Upload From File"}
            isSelected={openTab === "upload"}
            onClick={() => setOpenTab("upload")}>
            Upload
          </ToolbarButton>
          <ToolbarButton
            mainTooltip={"Embed From URL"}
            isSelected={openTab === "embed"}
            onClick={() => setOpenTab("embed")}>
            Embed
          </ToolbarButton>
        </Toolbar>
        <Input />
      </Stack>
    </Toolbar>
  );
};
