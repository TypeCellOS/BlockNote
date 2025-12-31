import { syncPlugin } from "@y/prosemirror";
import {
  ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";

export const YSyncExtension = createExtension(
  ({
    options,
  }: ExtensionOptions<
    Pick<
      CollaborationOptions,
      "fragment" | "attributionManager" | "suggestionDoc"
    >
  >) => {
    return {
      key: "ySync",
      prosemirrorPlugins: [
        syncPlugin(options.fragment, {
          attributionManager: options.attributionManager,
          suggestionDoc: options.suggestionDoc,
          mapAttributionToMark(format, attribution) {
            console.log("attribution", attribution);
            console.log("format", format);
            if (attribution.delete) {
              return Object.assign({}, format, {
                deletion: { id: Date.now(), user: attribution.delete?.[0] },
              });
            }
            if (attribution.insert) {
              return Object.assign({}, format, {
                insertion: { id: Date.now(), user: attribution.insert?.[0] },
              });
            }
            if (attribution.format) {
              return Object.assign({}, format, {
                insertion: { id: Date.now(), user: attribution.format?.[0] },
              });
            }
            return format;
          },
        }),
      ],
      runsBefore: ["default"],
    } as const;
  },
);
