import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  FileBlockConfig,
} from "../../../../schema/index.js";
import { createAddFileButton } from "./createAddFileButton.js";
import { createFileNameWithIcon } from "./createFileNameWithIcon.js";

export const createFileWithCaption = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<FileBlockConfig["type"], FileBlockConfig>,
    any,
    any
  >,
  element?: HTMLElement,
  buttonText?: string,
  buttonIcon?: HTMLElement,
) => {
  const fileWithCaption = document.createElement("div");
  fileWithCaption.className = "bn-file-with-caption";

  const file = document.createElement("div");
  file.className = "bn-file";
  fileWithCaption.appendChild(file);

  // Show the add file button if the file has not been uploaded yet. Change to
  // show a loader if a file upload for the block begins.
  if (block.props.url === "") {
    const addFileButton = createAddFileButton(
      block,
      editor,
      buttonText,
      buttonIcon,
    );

    const destroyUploadStartHandler = editor.onUploadStart((blockId) => {
      if (blockId === block.id) {
        const loading = document.createElement("div");
        loading.className = "bn-file-loading-preview";
        loading.textContent = "Loading...";
        addFileButton.dom.replaceWith(loading);
      }
    });

    return {
      dom: addFileButton.dom,
      destroy: () => {
        destroyUploadStartHandler();
        addFileButton.destroy?.();
      },
    };
  }

  const ret: { dom: HTMLElement; destroy?: () => void } = {
    dom: fileWithCaption,
  };

  // Show the file preview, or the file name and icon.
  if (block.props.showPreview === false || !element) {
    // Show file name and icon.
    const fileNameWithIcon = createFileNameWithIcon(block);
    file.appendChild(fileNameWithIcon.dom);

    ret.destroy = () => {
      fileNameWithIcon.destroy?.();
    };
  } else {
    // Show file preview.
    file.appendChild(element);
  }

  // Show the caption if there is one.
  if (block.props.caption) {
    const caption = document.createElement("p");
    caption.className = "bn-file-caption";
    caption.textContent = block.props.caption;
    fileWithCaption.appendChild(caption);
  }

  return ret;
};
