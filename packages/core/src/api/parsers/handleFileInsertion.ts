import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { PartialBlock } from "../../blocks/defaultBlocks";
import {
  BlockSchema,
  FileBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { getBlockInfoFromPos } from "../getBlockInfoFromPos";
import { acceptedMIMETypes } from "./acceptedMIMETypes";

function checkFileExtensionsMatch(
  fileExtension1: string,
  fileExtension2: string
) {
  if (!fileExtension1.startsWith(".") || !fileExtension2.startsWith(".")) {
    throw new Error(`The strings provided are not valid file extensions.`);
  }

  return fileExtension1 === fileExtension2;
}

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
      for (const mimeType of fileBlockConfig.fileBlockAccept || []) {
        const isFileExtension = mimeType.startsWith(".");
        const file = items[i].getAsFile();

        if (file) {
          if (
            (!isFileExtension &&
              file.type &&
              checkMIMETypesMatch(items[i].type, mimeType)) ||
            (isFileExtension &&
              checkFileExtensionsMatch(
                "." + file.name.split(".").pop(),
                mimeType
              ))
          ) {
            fileBlockType = fileBlockConfig.type;
            break;
          }
        }
      }
    }

    const file = items[i].getAsFile();
    if (file) {
      const updateData = await editor.uploadFile(file);

      const fileBlock =
        typeof updateData === "string"
          ? ({
              type: fileBlockType,
              props: {
                name: file.name,
                url: updateData,
              },
            } as PartialBlock<BSchema, I, S>)
          : { type: fileBlockType, ...updateData };

      if (event.type === "paste") {
        editor.insertBlocks(
          [fileBlock],
          editor.getTextCursorPosition().block,
          "after"
        );
      }

      if (event.type === "drop") {
        const coords = {
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        };

        const pos = editor._tiptapEditor.view.posAtCoords(coords);
        if (!pos) {
          return;
        }

        const blockInfo = getBlockInfoFromPos(
          editor._tiptapEditor.state.doc,
          pos.pos
        );

        editor.insertBlocks([fileBlock], blockInfo.id, "after");
      }
    }
  }
}
