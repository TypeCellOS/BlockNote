import { configureYProsemirror, pauseSync, syncPlugin } from "@y/prosemirror";
import {
  ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";

export const YSyncExtension = createExtension(
  ({
    options,
    editor,
  }: ExtensionOptions<
    Pick<CollaborationOptions, "fragment" | "attributionManager">
  >) => {
    return {
      key: "ySync",
      prosemirrorPlugins: [
        // In @y/prosemirror v2 the sync plugin is created without a ytype; the
        // fragment + attribution manager are bound later via
        // `configureYProsemirror` (see `mount` below).
        //
        // We rely on the binding's default `mapAttributionToMark`, which emits
        // exactly the canonical `y-attributed-insert` / `y-attributed-delete` /
        // `y-attributed-format` marks with the attrs our schema declares (see
        // SuggestionMarks.ts). A custom mapper is unnecessary and risks breaking
        // the reconcile-stability contract.
        //
        // `attributedNodes` opts every attributed block into rendering under its
        // `{name}--attributed` variant when the schema defines one (the binding
        // falls back to the canonical node + mark when it does not). This is what
        // lets a suggested block-type flip render the old + new block side by
        // side (e.g. a deleted `paragraph--attributed` next to an inserted
        // `heading--attributed`).
        syncPlugin({
          attributedNodes: (
            _nodeName: string,
            kinds: { insert?: boolean; delete?: boolean; format?: boolean },
          ) =>
            kinds.insert === true ||
            kinds.delete === true ||
            kinds.format === true,
        }),
      ],
      mount: () => {
        // The PM view exists by the time extensions mount (ExtensionManager
        // runs this on `editor.onMount`). Bind the collaborative type now.
        const view = editor.prosemirrorView;
        configureYProsemirror({
          ytype: options.fragment,
          attributionManager: options.attributionManager,
        })(view.state, view.dispatch.bind(view));
        return () => {
          const v = editor.prosemirrorView;
          if (v) {
            pauseSync(v.state, v.dispatch.bind(v));
          }
        };
      },
      runsBefore: ["default"],
    } as const;
  },
);
