import {
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  PartialBlock,
  SpecificBlock,
} from "@blocknote/core";
import { FileInput } from "@mantine/core";
import { useCallback } from "react";

const API_KEY = "ddada50bc0e11e4c060af6ce9ceacfc4";

export const UploadImageInput = <BSchema extends BlockSchema>(props: {
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
  const handleFileChange = useCallback(
    (payload: File) => {
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
          return response.json();
        })
        .then((data) => {
          const block = props.editor.getBlock(props.block);

          if (block === undefined || block.type !== "image") {
            return;
          }

          props.editor.updateBlock(props.block, {
            type: "image",
            props: {
              src: data.data.url,
            },
          } as PartialBlock<BSchema>);
        });
    },
    [props.block, props.editor]
  );

  return (
    <FileInput
      placeholder={"Upload Image"}
      size={"xs"}
      value={null}
      onChange={handleFileChange}
    />
  );
};
