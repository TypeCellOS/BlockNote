import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BlockNoteEditor, BlockSchema, PartialBlock } from "@blocknote/core";
import { RiImageEditFill, RiLink } from "react-icons/ri";

import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ToolbarInputDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdownButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ToolbarInputDropdownItem } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdownItem";

const API_KEY = "";

export const ReplaceImageButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const show = useMemo(
    () =>
      // Checks if only one block is selected.
      selectedBlocks.length === 1 &&
      // Checks if the selected block is an image.
      selectedBlocks[0].type === "image",
    [selectedBlocks]
  );

  const [isOpen, setIsOpen] = useState<boolean>(
    show && selectedBlocks[0].props.src === ""
  );
  const [currentURL, setCurrentURL] = useState<string>(
    show ? selectedBlocks[0].props.src : ""
  );

  useEffect(() => {
    setIsOpen(show && selectedBlocks[0].props.src === "");
    setCurrentURL(show ? selectedBlocks[0].props.src : "");
  }, [selectedBlocks, show]);

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
        props.editor.updateBlock(selectedBlocks[0], {
          type: "image",
          props: {
            src: currentURL,
          },
        } as PartialBlock<BSchema>);
      }
    },
    [currentURL, props.editor, selectedBlocks]
  );

  const handleURLPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      props.editor.updateBlock(selectedBlocks[0], {
        type: "image",
        props: {
          src: event.clipboardData!.getData("text/plain"),
        },
      } as PartialBlock<BSchema>);
    },
    [props.editor, selectedBlocks]
  );

  const handleFileChange = useCallback(
    (payload: File) => {
      const blockID = selectedBlocks[0].id;

      // TODO: Proper backend - right now using imgbb.com since you can get an
      //  API key for free by just making an account.
      //  https://imgbb.com/
      const body = new FormData();
      body.append("key", API_KEY);
      body.append("image", payload);

      fetch("https://api.imgbb.com/1/upload?expiration=600", {
        method: "POST",
        body: body,
      })
        .then((response) => {
          console.log(response);
          return response.json();
        })
        .then((data) => {
          console.log(data);
          const block = props.editor.getBlock(blockID);

          if (block === undefined || block.type !== "image") {
            return;
          }

          props.editor.updateBlock(blockID, {
            type: "image",
            props: {
              src: data.data.url,
            },
          } as PartialBlock<BSchema>);
        });
    },
    [props.editor, selectedBlocks]
  );

  if (!show) {
    return null;
  }

  return (
    <ToolbarInputDropdownButton visible={isOpen} maxWidth={200}>
      <ToolbarButton
        onClick={() => setIsOpen(!isOpen)}
        isSelected={isOpen}
        mainTooltip={"Replace Image"}
        icon={RiImageEditFill}
      />
      <ToolbarInputDropdown>
        <ToolbarInputDropdownItem
          type={"text"}
          icon={RiLink}
          inputProps={{
            placeholder: "Paste image URL...",
            value: currentURL,
            onChange: handleURLChange,
            onKeyDown: handleURLEnter,
            onPaste: handleURLPaste,
          }}
        />
        <ToolbarInputDropdownItem
          type={"file"}
          icon={RiImageEditFill}
          inputProps={{
            placeholder: "Upload image",
            value: null,
            onChange: handleFileChange,
          }}></ToolbarInputDropdownItem>
      </ToolbarInputDropdown>
    </ToolbarInputDropdownButton>
  );
};
