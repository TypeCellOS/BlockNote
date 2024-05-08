import {
  BlockFromConfig,
  InlineContentSchema,
  StyleSchema,
  createBlockSpec,
} from "../../schema";
import {
  FileBlockExtension,
  fileBlockImageExtension,
} from "./fileBlockExtensions";
import { fileBlockConfig } from "./fileBlockConfig";
import { renderFile } from "./renderFile";

export const fileToExternalHTML = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  block: BlockFromConfig<typeof fileBlockConfig, ISchema, SSchema>
) => {
  if (block.props.url === "") {
    const div = document.createElement("p");
    div.innerHTML = "Add file";

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

export const createFileBlock = (
  extensions: Record<string, FileBlockExtension> = {
    image: fileBlockImageExtension,
  }
) =>
  createBlockSpec(fileBlockConfig, {
    render: (block, editor) => renderFile(block, editor, extensions),
    toExternalHTML: fileToExternalHTML,
    parse: parseFile,
  });

// - React support?
// - Support parse HTML and toExternalHTML
// - Copy/paste support
// - Drag/drop from external into BlockNote (automatic conversion to block & upload)
// - Custom props e.g. PDF height, video playback options
// - Toolbar/menu options should change based on file type
// - Button text/icon should be file type specific
// - Should be able to define the file type before uploading/embedding
// - Media like pdfs should be previewable (might be issues with cross domain access)
// - Renderers should be loosely coupled to file extensions via plugins for different file types
