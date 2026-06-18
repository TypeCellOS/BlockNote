import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { CollaborationOptions } from "./index.js";

/**
 * Deterministic hash of a string to an unsigned 32-bit integer.
 */
const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

/**
 * Pick a deterministic user-color from a palette based on user ids.
 * Must be deterministic so the sync plugin's readback matches the mapper output.
 */
const userColorPalette = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];

const colorForUserIds = (
  userIds: readonly string[] | undefined | null,
): string => {
  if (!userIds || userIds.length === 0) {
    return userColorPalette[0];
  }
  return userColorPalette[
    hashStr(String(userIds[0])) % userColorPalette.length
  ];
};

/**
 * Map a Y attribution to BlockNote's `y-attributed-*` mark attrs.
 *
 * The mapper must be deterministic in `(format, attribution)` and emit
 * attrs that exactly match the declared mark schema in SuggestionMarks.ts.
 * Any mismatch causes the sync plugin to fire phantom reconcile dispatches
 * in a loop. See ATTRIBUTION.md in @y/prosemirror.
 *
 * Declared attrs per mark (all three are the same shape):
 * - y-attributed-insert: { id, "user-color" }
 * - y-attributed-delete: { id, "user-color" }
 * - y-attributed-format: { id, "user-color" }
 */
const mapAttributionToMark = (
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
    out["y-attributed-insert"] = {
      userIds: attribution.insert,
      timestamp: attribution.insertAt ?? null,
      "user-color": colorForUserIds(attribution.insert),
    };
  }

  if (attribution.delete) {
    out["y-attributed-delete"] = {
      userIds: attribution.delete,
      timestamp: attribution.deleteAt ?? null,
      "user-color": colorForUserIds(attribution.delete),
    };
  }

  if (attribution.format) {
    const userIds = [...new Set(Object.values(attribution.format).flat())];
    out["y-attributed-format"] = {
      userIds,
      format: attribution.format,
      timestamp: attribution.formatAt ?? null,
      "user-color": colorForUserIds(userIds),
    };
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
      "fragment" | "attributionManager" | "suggestionDoc" | "provider"
    >
  >) => {
    return {
      key: "ySync",
      mount: () => {
        // TODO this is trash
        if (
          options.provider &&
          "synced" in options.provider &&
          typeof options.provider.synced === "boolean"
        ) {
          if (options.provider["synced"]) {
            // I hate this so much
            editor.exec(
              configureYProsemirror({
                ytype: options.fragment,
                attributionManager: options.attributionManager,
              }),
            );
          } else if (
            "on" in options.provider &&
            typeof options.provider.on === "function"
          ) {
            options.provider.on("synced", (synced: boolean) => {
              if (synced) {
                // I hate this so much
                editor.exec(
                  configureYProsemirror({
                    ytype: options.fragment,
                    attributionManager: options.attributionManager,
                  }),
                );
              }
            });
          } else {
            throw new Error(
              "YSyncExtension: provider must have a 'synced' boolean or an 'on' method to listen for 'sync'",
            );
          }
        } else {
          // unsure what to do, so just going to go for it
          // I hate this so much
          editor.exec(
            configureYProsemirror({
              ytype: options.fragment,
              attributionManager: options.attributionManager,
            }),
          );
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
    } as const;
  },
);
