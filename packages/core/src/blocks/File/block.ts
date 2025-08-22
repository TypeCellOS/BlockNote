import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockNoDefaults,
  createBlockConfig,
  createBlockSpec,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { parseEmbedElement } from "./helpers/parse/parseEmbedElement.js";
import { parseFigureElement } from "./helpers/parse/parseFigureElement.js";
import { createFileBlockWrapper } from "./helpers/render/createFileBlockWrapper.js";
import { createLinkWithCaption } from "./helpers/toExternalHTML/createLinkWithCaption.js";

export const createFileBlockConfig = createBlockConfig(
  () =>
    ({
      type: "file" as const,
      propSchema: {
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
      },
      content: "none" as const,
      meta: {
        fileBlockAccept: ["*/*"],
      },
    }) as const,
);

export const fileParse = () => (element: HTMLElement) => {
  if (element.tagName === "EMBED") {
    // Ignore if parent figure has already been parsed.
    if (element.closest("figure")) {
      return undefined;
    }

    return parseEmbedElement(element as HTMLEmbedElement);
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "embed");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    return {
      ...parseEmbedElement(targetElement as HTMLEmbedElement),
      caption,
    };
  }

  return undefined;
};

export const fileRender =
  () =>
  (
    block: BlockNoDefaults<
      Record<"file", ReturnType<typeof createFileBlockConfig>>,
      any,
      any
    >,
    editor: BlockNoteEditor<
      Record<"file", ReturnType<typeof createFileBlockConfig>>,
      any,
      any
    >,
  ) =>
    createFileBlockWrapper(block, editor);

export const fileToExternalHTML =
  () =>
  (
    block: BlockNoDefaults<
      Record<"file", ReturnType<typeof createFileBlockConfig>>,
      any,
      any
    >,
    _editor: BlockNoteEditor<
      Record<"file", ReturnType<typeof createFileBlockConfig>>,
      any,
      any
    >,
  ) => {
    if (!block.props.url) {
      const div = document.createElement("p");
      div.textContent = "Add file";

      return {
        dom: div,
      };
    }

    const fileSrcLink = document.createElement("a");
    fileSrcLink.href = block.props.url;
    fileSrcLink.textContent = block.props.name || block.props.url;

    if (block.props.caption) {
      return createLinkWithCaption(fileSrcLink, block.props.caption);
    }

    return {
      dom: fileSrcLink,
    };
  };

export const createFileBlockSpec = createBlockSpec(
  createFileBlockConfig,
).implementation(() => ({
  parse: fileParse(),
  render: fileRender(),
  toExternalHTML: fileToExternalHTML(),
}));
