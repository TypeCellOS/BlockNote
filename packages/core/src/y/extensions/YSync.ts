import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
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
      id: attribution.insert[0] ?? null,
      "user-color": colorForUserIds(attribution.insert),
    };
  }

  if (attribution.delete) {
    out["y-attributed-delete"] = {
      id: attribution.delete[0] ?? null,
      "user-color": colorForUserIds(attribution.delete),
    };
  }

  if (attribution.format) {
    const userIds = [...new Set(Object.values(attribution.format).flat())];
    out["y-attributed-format"] = {
      id: userIds[0] ?? null,
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
          mapAttributionToMark,
          attributedNodes: (
            nodeName: string,
            kinds: { delete: boolean; insert: boolean; format: boolean },
          ) => {
            // attributedNodes gates shadows on blockSpecs and delete only
            const result = Boolean(
              editor.schema.blockSpecs[nodeName] && kinds.delete,
            );

            return result;
          },
        }),
      ],
      runsBefore: ["default"],
    } as const;
  },
);
