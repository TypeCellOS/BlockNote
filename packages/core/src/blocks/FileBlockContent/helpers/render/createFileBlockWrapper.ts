import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  FileBlockConfig,
} from "../../../../schema/index.js";
import { createAddFileButton } from "./createAddFileButton.js";
import { createFileNameWithIcon } from "./createFileNameWithIcon.js";

export const createFileBlockWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<FileBlockConfig["type"], FileBlockConfig>,
    any,
    any
  >,
  element?: { dom: HTMLElement; destroy?: () => void },
  buttonText?: string,
  buttonIcon?: HTMLElement
) => {
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  // Show the add file button if the file has not been uploaded yet. Change to
  // show a loader if a file upload for the block begins.
  if (block.props.url === "") {
    const addFileButton = createAddFileButton(
      block,
      editor,
      buttonText,
      buttonIcon
    );
    wrapper.appendChild(addFileButton.dom);

    const destroyUploadStartHandler = editor.onUploadStart((blockId) => {
      if (blockId === block.id) {
        wrapper.removeChild(addFileButton.dom);

        const loading = document.createElement("div");
        loading.className = "bn-file-loading-preview";
        loading.textContent = "Loading...";
        wrapper.appendChild(loading);
      }
    });

    return {
      dom: wrapper,
      destroy: () => {
        destroyUploadStartHandler();
        addFileButton.destroy();
      },
    };
  }

  const ret: { dom: HTMLElement; destroy?: () => void } = { dom: wrapper };

  // Show the file preview, or the file name and icon.
  if (block.props.showPreview === false || !element) {
    // Show file name and icon.
    const fileNameWithIcon = createFileNameWithIcon(block);
    wrapper.appendChild(fileNameWithIcon.dom);

    ret.destroy = () => {
      fileNameWithIcon.destroy?.();
    };
  } else {
    // Show file preview.
    wrapper.appendChild(element.dom);
  }

  // Show the caption if there is one.
  if (block.props.caption) {
    const caption = document.createElement("p");
    caption.className = "bn-file-caption";
    caption.textContent = block.props.caption;
    wrapper.appendChild(caption);
  }

  return ret;
};
