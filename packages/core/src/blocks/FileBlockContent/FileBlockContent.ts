import * as z from "zod/v4";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  createBlockSpec,
  FileBlockConfig,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { parseEmbedElement } from "./helpers/parse/parseEmbedElement.js";
import { parseFigureElement } from "./helpers/parse/parseFigureElement.js";
import { createFileBlockWrapper } from "./helpers/render/createFileBlockWrapper.js";
import { createLinkWithCaption } from "./helpers/toExternalHTML/createLinkWithCaption.js";

export const baseFilePropSchema = z.object({
  caption: z.string().default(""),
  name: z.string().default(""),
});

export const optionalFilePropFields = z.object({
  // URL is optional, as we also want to accept files with no URL, but for example ids
  // (ids can be used for files that are resolved on the backend)
  url: z.string().default(""),
  // Whether to show the file preview or the name only.
  // This is useful for some file blocks, but not all
  // (e.g.: not relevant for default "file" block which doesn;'t show previews)
  showPreview: z.boolean().default(true),
  // File preview width in px.
  previewWidth: z.number(),
});

export const filePropSchema = defaultProps
  .pick({
    backgroundColor: true,
  })
  .extend(baseFilePropSchema.shape)
  .extend(optionalFilePropFields.pick({ url: true }).shape);

export const fileBlockConfig = {
  type: "file" as const,
  propSchema: filePropSchema,
  content: "none",
  isFileBlock: true,
} satisfies FileBlockConfig;

export const fileRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) => {
  return createFileBlockWrapper(block, editor);
};

export const fileParse = (element: HTMLElement) => {
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

export const fileToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
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

export const FileBlock = createBlockSpec(fileBlockConfig, {
  render: fileRender,
  parse: fileParse,
  toExternalHTML: fileToExternalHTML,
});
