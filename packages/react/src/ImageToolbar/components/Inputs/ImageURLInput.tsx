import {
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  PartialBlock,
  SpecificBlock,
} from "@blocknote/core";
import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useState,
} from "react";
import { TextInput } from "@mantine/core";

export const ImageURLInput = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  block: SpecificBlock<
    BlockSchema & {
      image: BlockSpec<
        "image",
        {
          src: { default: string };
        },
        false
      >;
    },
    "image"
  >;
}) => {
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
};
