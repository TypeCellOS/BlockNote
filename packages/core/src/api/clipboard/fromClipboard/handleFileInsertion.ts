import { Block, PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { getNearestBlockPos } from "../../getBlockInfoFromPos.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";

function checkFileExtensionsMatch(
  fileExtension1: string,
  fileExtension2: string,
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

function insertOrUpdateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  referenceBlock: Block<BSchema, I, S>,
  newBlock: PartialBlock<BSchema, I, S>,
  placement: "before" | "after" = "after",
) {
  let insertedBlockId: string | undefined;

  if (
    Array.isArray(referenceBlock.content) &&
    referenceBlock.content.length === 0
  ) {
    insertedBlockId = editor.updateBlock(referenceBlock, newBlock).id;
  } else {
    insertedBlockId = editor.insertBlocks(
      [newBlock],
      referenceBlock,
      placement,
    )[0].id;
  }

  return insertedBlockId;
}

export async function handleFileInsertion<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(event: DragEvent | ClipboardEvent, editor: BlockNoteEditor<BSchema, I, S>) {
  if (!editor.uploadFile) {
    // eslint-disable-next-line no-console
    console.warn(
      "Attempted ot insert file, but uploadFile is not set in the BlockNote editor options",
    );
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

  for (let i = 0; i < items.length; i++) {
    // Gets file block corresponding to MIME type.
    let fileBlockType = "file";
    for (const blockSpec of Object.values(editor.schema.blockSpecs)) {
      for (const mimeType of blockSpec.implementation.meta?.fileBlockAccept ||
        []) {
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
                mimeType,
              ))
          ) {
            fileBlockType = blockSpec.config.type;
            break;
          }
        }
      }
    }

    const file = items[i].getAsFile();
    if (file) {
      const fileBlock = {
        type: fileBlockType,
        props: {
          name: file.name,
        },
      } as PartialBlock<BSchema, I, S>;

      let insertedBlockId: string | undefined = undefined;

      if (event.type === "paste") {
        const currentBlock = editor.getTextCursorPosition().block;
        insertedBlockId = insertOrUpdateBlock(editor, currentBlock, fileBlock);
      } else if (event.type === "drop") {
        const coords = {
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        };

        const pos = editor.prosemirrorView.posAtCoords(coords);

        if (!pos) {
          return;
        }

        insertedBlockId = editor.transact((tr) => {
          const posInfo = getNearestBlockPos(tr.doc, pos.pos);
          const blockElement = editor.prosemirrorView.dom.querySelector(
            `[data-id="${posInfo.node.attrs.id}"]`,
          );

          const blockRect = blockElement?.getBoundingClientRect();

          return insertOrUpdateBlock(
            editor,
            editor.getBlock(posInfo.node.attrs.id)!,
            fileBlock,
            blockRect && (blockRect.top + blockRect.bottom) / 2 > coords.top
              ? "before"
              : "after",
          );
        });
      } else {
        return;
      }

      const updateData = await editor.uploadFile(file, insertedBlockId);

      const updatedFileBlock =
        typeof updateData === "string"
          ? ({
              props: {
                url: updateData,
              },
            } as PartialBlock<BSchema, I, S>)
          : { ...updateData };

      editor.updateBlock(insertedBlockId, updatedFileBlock);
    }
  }
}
