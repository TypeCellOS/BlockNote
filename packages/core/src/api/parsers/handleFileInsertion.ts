import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { PartialBlock } from "../../blocks/defaultBlocks";
import { insertOrUpdateBlock } from "../../extensions/SuggestionMenu/getDefaultSlashMenuItems";
import {
  BlockSchema,
  FileBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { acceptedMIMETypes } from "./acceptedMIMETypes";

function checkMIMETypesMatch(mimeType1: string, mimeType2: string) {
  const types1 = mimeType1.split("/");
  const types2 = mimeType2.split("/");

  if (types1.length !== 2) {
    throw new Error(`The string ${mimeType1} is not a valid MIME type.`);
  }
  if (types2.length !== 2) {
    throw new Error(`The string ${mimeType2} is not a valid MIME type.`);
  }

  if (types1[1] === "*" || types2[1] === "*") {
    return types1[0] === types2[0];
  }
  if (types1[0] === "*" || types2[0] === "*") {
    return types1[1] === types2[1];
  }

  return types1[0] === types2[0] && types1[1] === types2[1];
}

export async function handleFileInsertion<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(event: DragEvent | ClipboardEvent, editor: BlockNoteEditor<BSchema, I, S>) {
  if (!editor.uploadFile) {
    return;
  }

  const dataTransfer =
    "dataTransfer" in event ? event.dataTransfer : event.clipboardData;
  if (dataTransfer === null) {
    return;
  }

  let format: (typeof acceptedMIMETypes)[number] | null = null;
  for (const mimeType of acceptedMIMETypes) {
    if (dataTransfer.types.includes(mimeType)) {
      format = mimeType;
      break;
    }
  }
  if (format !== "Files") {
    return;
  }

  const items = dataTransfer.items;
  if (!items) {
    return;
  }

  event.preventDefault();

  const fileBlockConfigs = Object.values(editor.schema.blockSchema).filter(
    (blockConfig) => blockConfig.isFileBlock
  ) as FileBlockConfig[];

  for (let i = 0; i < items.length; i++) {
    // Gets file block corresponding to MIME type.
    let fileBlockType = "file";
    for (const fileBlockConfig of fileBlockConfigs) {
      for (const mimeType of fileBlockConfig.fileBlockAcceptMimeTypes || []) {
        if (checkMIMETypesMatch(items[i].type, mimeType)) {
          fileBlockType = fileBlockConfig.type;
          break;
        }
      }
    }

    const file = items[i].getAsFile();
    if (file) {
      const updateData = await editor.uploadFile(file);

      if (typeof updateData === "string") {
        const fileBlock = {
          type: fileBlockType,
          props: {
            name: file.name,
            url: updateData,
          },
        } as PartialBlock<BSchema, I, S>;

        insertOrUpdateBlock(editor, fileBlock);
      }
    }
  }
}
