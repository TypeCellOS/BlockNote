import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./index.js";

export const YSyncExtension = createExtension(
  ({
    options,
    editor,
  }: ExtensionOptions<
    Pick<
      CollaborationOptions,
      "fragment" | "attributionManager" | "suggestionDoc"
    >
  >) => {
    return {
      key: "ySync",
      mount: () => {
        // I hate this so much
        editor.exec(
          configureYProsemirror({
            ytype: options.fragment,
            attributionManager: options.attributionManager,
          }),
        );
      },
      prosemirrorPlugins: [
        syncPlugin({
          suggestionDoc: options.suggestionDoc,
        }),
      ],
      runsBefore: ["default"],
    } as const;
  },
);
