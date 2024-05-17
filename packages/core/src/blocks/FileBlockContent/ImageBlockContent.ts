import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";
import { renderWithResizeHandles } from "./extensions/utils/renderWithResizeHandles";

import {
  createFileAndCaptionDOM,
  createFileIconAndNameDOM,
  createFilePlaceholderDOM,
  fileParse,
  fileToExternalHTML,
} from "./fileBlockHelpers";

export const propSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // File name.
  name: {
    default: "" as const,
  },
  // File url.
  url: {
    default: "" as const,
  },
  // File caption.
  caption: {
    default: "" as const,
  },

  showPreview: {
    default: true,
  },
  // File preview width in px.
  previewWidth: {
    default: 512,
  },
} satisfies PropSchema;

export const imageBlockConfig = {
  type: "image" as const,
  propSchema,
  content: "none",
  isFileBlock: true,
} satisfies FileBlockConfig;

export const fileRender = (
  block: BlockFromConfig<typeof imageBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  // const fileType = block.props.fileType;
  // block.props.showPreview && fileType && extensions && fileType in extensions
  // ? extensions[fileType].render(block, editor)
  // : defaultFileRender(block);

  // File element.

  if (block.props.url === "") {
    const placeholder = createFilePlaceholderDOM(block, editor);
    wrapper.appendChild(placeholder.dom);

    return {
      dom: wrapper,
      destroy: () => {
        placeholder?.destroy?.();
      },
    };
  } else if (!block.props.showPreview) {
    const file = createFileIconAndNameDOM(block).dom;
    const element = createFileAndCaptionDOM(block, editor, file);

    return {
      dom: element.dom,
    };
  } else {
    const image = document.createElement("img");
    image.className = "bn-visual-media";
    image.src = block.props.url;
    image.alt = block.props.caption || "BlockNote image";
    image.contentEditable = "false";
    image.draggable = false;
    image.width = Math.min(
      block.props.previewWidth,
      editor.domElement.firstElementChild!.clientWidth
    );

    const file = renderWithResizeHandles(
      block,
      editor,
      image,
      () => image.width,
      (width) => (image.width = width)
    );

    const element = createFileAndCaptionDOM(block, editor, file.dom);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
      destroy: file.destroy,
    };
  }
};

export const ImageBlock = createBlockSpec(imageBlockConfig, {
  render: (block, editor) => fileRender(block, editor),
  parse: (element) => fileParse(element),
  toExternalHTML: (block, editor) => fileToExternalHTML(block, editor),
});
