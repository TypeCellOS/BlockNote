import { ySyncPlugin } from "y-prosemirror";
import { XmlFragment } from "yjs";
import {
  ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";

export const YSync = createExtension(
  ({ options }: ExtensionOptions<{ fragment: XmlFragment }>) => {
    return {
      key: "ySync",
      prosemirrorPlugins: [ySyncPlugin(options.fragment)],
      runsBefore: ["default"],
    } as const;
  },
);
