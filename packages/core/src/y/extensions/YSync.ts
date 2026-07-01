import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { CollaborationOptions } from "./index.js";
import { SuggestionMarksExtension } from "./SuggestionMarksExtension.js";
import { YSuggestionMarksExtension } from "./YSuggestionMarks.js";
import { normalizeToUserStore } from "../../user/index.js";

/**
 * Maps a Y attribution to BlockNote's `y-attributed-*` mark attrs.
 *
 * The mapper must be deterministic in `(format, attribution)` and emit attrs
 * that exactly match the declared mark schema in YSuggestionMarks.ts. Any
 * mismatch causes the sync plugin to fire phantom reconcile dispatches in a
 * loop. See ATTRIBUTION.md in @y/prosemirror.
 *
 * Crucially the marks carry only stable identity (`userIds`, plus `format` for
 * the modification mark) — *not* user colors. Colors resolve asynchronously
 * from the {@link UserStore}, so baking them in here would make the mapper's
 * output change under a fixed `(format, attribution)` once a user loads, which
 * is exactly the non-determinism that triggers the reconcile loop. Instead the
 * `SuggestionMarksExtension` applies colors as a decoration layer that can
 * update independently of the mark representation.
 */
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
      | "attributionManager"
      | "suggestionDoc"
      | "provider"
      | "resolveUsers"
      | "getSuggestionMarkClassName"
    >
  >) => {
    // Resolve suggestion authors (usernames and colors) through this store. The
    // collaboration extension passes an already-built store here (shared with
    // comments/versioning); a resolver callback is also accepted for standalone
    // use.
    const userStore = normalizeToUserStore(options.resolveUsers);
    return {
      key: "ySync",
      userStore,
      mount: () => {
        const configure = () => {
          editor.exec(
            configureYProsemirror({
              ytype: options.fragment,
              attributionManager: options.attributionManager,
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
        }),
      ],
      runsBefore: ["default"],
      // The `y-attributed-*` suggestion marks aren't part of the default schema
      // — they're only needed with collaboration. Register them here (so the
      // block node specs can allow them), along with the attribution tooltip
      // shown when hovering a suggestion mark.
      blockNoteExtensions: [
        YSuggestionMarksExtension({
          getSuggestionMarkClassName: options.getSuggestionMarkClassName,
        }),
        SuggestionMarksExtension({
          userStore,
          getSuggestionMarkClassName: options.getSuggestionMarkClassName,
        }),
      ],
    } as const;
  },
);
