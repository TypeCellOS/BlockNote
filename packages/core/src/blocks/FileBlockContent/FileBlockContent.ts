import { createBlockSpec } from "../../schema";
import { fileBlockConfig } from "./fileBlockConfig";
import { createFileBlockImplementation } from "./fileBlockImplementation";
import { FileBlockExtension } from "./fileBlockExtension";

export const createFileBlock = (
  extensions?: Record<string, FileBlockExtension>
) =>
  createBlockSpec(fileBlockConfig, createFileBlockImplementation(extensions));

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
