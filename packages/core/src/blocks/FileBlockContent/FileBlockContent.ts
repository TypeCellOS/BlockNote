import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";

import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  CustomBlockConfig,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";

export const filePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // File url.
  url: {
    default: "" as const,
  },
  // File caption.
  caption: {
    default: "" as const,
  },
  // File width in px.
  previewWidth: {
    default: 512 as const,
  },
} satisfies PropSchema;

// Converts text alignment prop values to the flexbox `align-items` values.
const textAlignmentToAlignItems = (
  textAlignment: "left" | "center" | "right" | "justify"
): "flex-start" | "center" | "flex-end" => {
  switch (textAlignment) {
    case "left":
      return "flex-start";
    case "center":
      return "center";
    case "right":
      return "flex-end";
    default:
      return "flex-start";
  }
};

export const fileBlockConfig = {
  type: "file" as const,
  propSchema: filePropSchema,
  content: "none",
} satisfies CustomBlockConfig;

const renderDefaultFile = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  block: BlockFromConfig<typeof fileBlockConfig, ISchema, SSchema>
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file";
  file.contentEditable = "false";
  file.draggable = false;
  file.style.width = "100%";
  file.innerText = block.props.url.split("/").pop() || "";

  return {
    dom: file,
  };
};

export const renderFile = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  block: BlockFromConfig<typeof fileBlockConfig, ISchema, SSchema>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    ISchema,
    SSchema
  >
) => {
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";
  wrapper.style.alignItems = textAlignmentToAlignItems(
    block.props.textAlignment
  );

  // Button element that acts as a placeholder for files with no src.
  const addFileButton = document.createElement("div");
  addFileButton.className = "bn-add-file-button";

  // Icon for the add file button.
  const addFileButtonIcon = document.createElement("div");
  addFileButtonIcon.className = "bn-add-file-button-icon";

  // Text for the add file button.
  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";
  addFileButtonText.innerText = "Add File";

  // Wrapper element for the file, resize handles and caption.
  const fileAndCaptionWrapper = document.createElement("div");
  fileAndCaptionWrapper.className = "bn-file-and-caption-wrapper";

  const fileExtension = block.props.url.split(".").pop();
  const renderedFileExtension =
    fileExtension && fileExtension in editor.renderFileExtension
      ? editor.renderFileExtension[fileExtension](block, editor)
      : renderDefaultFile(block);

  // File element.
  const file = renderedFileExtension.dom;

  // Caption element.
  const caption = document.createElement("p");
  caption.className = "bn-file-caption";
  caption.innerText = block.props.caption;
  caption.style.paddingBlock = block.props.caption ? "4px" : "";

  // Adds a light blue outline to selected file blocks.
  const handleEditorUpdate = () => {
    const selection = editor.getSelection()?.blocks || [];
    const currentBlock = editor.getTextCursorPosition().block;

    const isSelected =
      [currentBlock, ...selection].find(
        (selectedBlock) => selectedBlock.id === block.id
      ) !== undefined;

    if (isSelected) {
      addFileButton.style.outline = "4px solid rgb(100, 160, 255)";
      fileAndCaptionWrapper.style.outline = "4px solid rgb(100, 160, 255)";
    } else {
      addFileButton.style.outline = "";
      fileAndCaptionWrapper.style.outline = "";
    }
  };
  editor.onEditorContentChange(handleEditorUpdate);
  editor.onEditorSelectionChange(handleEditorUpdate);

  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();
  };
  // Opens the file toolbar.
  const addFileButtonClickHandler = () => {
    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
        block: block,
      })
    );
  };

  addFileButton.appendChild(addFileButtonIcon);
  addFileButton.appendChild(addFileButtonText);

  fileAndCaptionWrapper.appendChild(file);
  fileAndCaptionWrapper.appendChild(caption);

  if (block.props.url === "") {
    wrapper.appendChild(addFileButton);
  } else {
    wrapper.appendChild(fileAndCaptionWrapper);
  }

  addFileButton.addEventListener("mousedown", addFileButtonMouseDownHandler);
  addFileButton.addEventListener("click", addFileButtonClickHandler);

  return {
    dom: wrapper,
    destroy: () => {
      addFileButton.removeEventListener(
        "mousedown",
        addFileButtonMouseDownHandler
      );
      addFileButton.removeEventListener("click", addFileButtonClickHandler);
      renderedFileExtension?.destroy?.();
    },
  };
};

export const fileToExternalHTML = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  block: BlockFromConfig<typeof fileBlockConfig, ISchema, SSchema>
) => {
  if (block.props.url === "") {
    const div = document.createElement("p");
    div.innerHTML = "Add File";

    return {
      dom: div,
    };
  }

  const div = document.createElement("p");
  div.innerText = block.props.url;

  return {
    dom: div,
  };
};

export const parseFile = () => {
  return undefined;
};

export const File = createBlockSpec(fileBlockConfig, {
  render: renderFile,
  toExternalHTML: fileToExternalHTML,
  parse: parseFile,
});
