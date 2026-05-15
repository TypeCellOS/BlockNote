import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  ExtensionOptions,
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
        configureYProsemirror({
          ytype: options.fragment,
          attributionManager: null,
        })(editor.prosemirrorState, editor.prosemirrorView.dispatch);
      },
      prosemirrorPlugins: [
        syncPlugin({
          suggestionDoc: options.suggestionDoc,
          // // @ts-ignore types are messed up in the @y/prosemirror package right now
          // mapAttributionToMark(format, attribution) {
          //   console.log("attribution", attribution);
          //   console.log("format", format);
          //   if (attribution.delete) {
          //     return Object.assign({}, format, {
          //       deletion: { id, user: attribution.delete?.[0] },
          //     });
          //   }
          //   if (attribution.insert) {
          //     return Object.assign({}, format, {
          //       insertion: { id, user: attribution.insert?.[0] },
          //     });
          //   }
          //   if (attribution.format) {
          //     return Object.assign({}, format, {
          //       insertion: { id, user: attribution.format?.[0] },
          //     });
          //   }
          //   return format;
          // },
        }),
      ],
      runsBefore: ["default"],
    } as const;
  },
);
