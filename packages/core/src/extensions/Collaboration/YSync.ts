import { ySyncPlugin } from "y-prosemirror";
import {
  ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";

export const YSyncExtension = createExtension(
  ({ options }: ExtensionOptions<Pick<CollaborationOptions, "fragment">>) => {
    return {
      key: "ySync",
      prosemirrorPlugins: [ySyncPlugin(options.fragment)],
      runsBefore: ["default"],
    } as const;
  },
);
