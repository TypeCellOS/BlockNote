import {
  configureYProsemirror,
  syncPlugin,
  ySyncPluginKey,
} from "@y/prosemirror";
import type { Node } from "prosemirror-model";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { docToBlocks } from "../../api/nodeConversions/nodeToBlock.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { CollaborationOptions } from "./index.js";

/**
 * Maps a Y attribution to BlockNote's `y-attributed-*` mark attrs.
 *
 * The mapper must be deterministic in `(format, attribution)` and emit attrs
 * that exactly match the declared mark schema in YAttributionMarks.ts. Any
 * mismatch causes the sync plugin to fire phantom reconcile dispatches in a
 * loop. See ATTRIBUTION.md in @y/prosemirror.
 *
 * Crucially the marks carry only stable identity (`userIds`, plus `format` for
 * the modification mark) — *not* user colors. Colors resolve asynchronously
 * from the {@link UserStore}, so baking them in here would make the mapper's
 * output change under a fixed `(format, attribution)` once a user loads, which
 * is exactly the non-determinism that triggers the reconcile loop. Instead the
 * `AttributionExtension` applies colors as a decoration layer that can
 * update independently of the mark representation.
 */
/**
 * Whether a ProseMirror document is BlockNote's initial (empty) state:
 * a single empty paragraph block. Ids and props are deliberately ignored —
 * a freshly mounted editor mints a random block id, but that skeleton still
 * carries no real content and must not be written into an empty Y fragment.
 * Anything more (extra blocks, non-empty text, a non-paragraph block, nested
 * children) counts as real content and syncs immediately.
 */
function isInitialBlockNoteDoc<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(doc: Node): boolean {
  const blocks = docToBlocks<BSchema, I, S>(doc);
  const block = blocks.length === 1 ? blocks[0] : undefined;
  if (!block || block.type !== "paragraph" || block.children.length !== 0) {
    return false;
  }
  const { content } = block;
  return (
    content === undefined ||
    ((typeof content === "string" || Array.isArray(content)) &&
      content.length === 0)
  );
}
export const mapAttributionToMark = (
  format: Record<string, unknown> | null,
  attribution: {
    insert?: readonly string[];
    delete?: readonly string[];
    format?: Record<string, readonly string[]>;
    insertAt?: number;
    deleteAt?: number;
    formatAt?: number;
  },
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...format };

  if (attribution.insert) {
    out["y-attributed-insert"] = { userIds: attribution.insert };
  }

  if (attribution.delete) {
    out["y-attributed-delete"] = { userIds: attribution.delete };
  }

  if (attribution.format) {
    const userIds = [...new Set(Object.values(attribution.format).flat())];
    out["y-attributed-format"] = { userIds, format: attribution.format };
  }

  return out;
};

export const YSyncExtension = createExtension(
  ({
    options,
    editor,
  }: ExtensionOptions<
    Pick<
      CollaborationOptions,
      | "fragment"
      | "renderer"
      | "suggestionDoc"
      | "provider"
      | "getAttributionMarkClassName"
    >
  >) => {
    return {
      key: "ySync",
      fragment: options.fragment,
      mount: () => {
        // The sync plugin reconnects an existing configuration when its view is
        // recreated. Do not switch an active suggestion editor back to the
        // base fragment on remount.
        if (ySyncPluginKey.getState(editor.prosemirrorState)?.ytype) {
          return;
        }

        const configure = () => {
          editor.exec(
            configureYProsemirror({
              ytype: options.fragment,
              // purposefully not passing `renderer` here, this is only for syncing the main doc, not switching to suggestion mode
              // In the future, we may want view suggestion mode to be the default, and then we can decide how to indicate that through the options.
              // For now though, we are leaving suggestion mode as experimental and must be explicitly enabled through the SuggestionsExtension.
            }),
          );
        };

        if (
          options.provider &&
          "synced" in options.provider &&
          typeof options.provider.synced === "boolean"
        ) {
          if (options.provider["synced"]) {
            configure();
          } else if (
            "on" in options.provider &&
            typeof options.provider.on === "function"
          ) {
            options.provider.on("synced", (synced: boolean) => {
              if (synced) {
                configure();
              }
            });
          } else {
            throw new Error(
              "YSyncExtension: provider must have a 'synced' boolean or an 'on' method to listen for 'sync'",
            );
          }
        } else {
          configure();
        }
      },
      prosemirrorPlugins: [
        syncPlugin({
          suggestionDoc: options.suggestionDoc,
          mapAttributionToMark,
          // Node-pairing policy for the PM->Y diff: a `blockContainer` whose
          // block-content type changes is treated as a *different* node, so the
          // diff replaces the whole container (deleted + inserted siblings in
          // the blockGroup) instead of producing two block-contents in one
          // container => schema-invalid. No schema change / storage transform
          // needed; `blockContainer` already whitelists the `y-attributed-*`
          // marks. See blockMatchNodes.ts.
          customCompare: blockMatchNodes,
          // Initial-empty gate: a single empty paragraph (any id/props) must
          // not seed an empty Y fragment — see isInitialBlockNoteDoc above
          // and "Initial-content gate" in ProsemirrorRdt's doc.
          isInitialContent: isInitialBlockNoteDoc,
        }),
      ],
      runsBefore: ["default"],
    } as const;
  },
);
