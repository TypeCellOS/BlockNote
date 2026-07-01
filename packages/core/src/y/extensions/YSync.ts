import { configureYProsemirror, syncPlugin } from "@y/prosemirror";
import {
  type ExtensionOptions,
  createExtension,
} from "../../editor/BlockNoteExtension.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { CollaborationOptions } from "./index.js";
import { SuggestionMarksExtension } from "./SuggestionMarksExtension.js";
import { YSuggestionMarksExtension } from "./YSuggestionMarks.js";
import { normalizeToUserStore, type UserStore } from "../../user/index.js";

/**
 * Deterministic hash of a string to an unsigned 32-bit integer.
 */
const hashStr = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i);
  }
  return Math.abs(hash);
};

/**
 * Fallback palette used when a user isn't resolved in the {@link UserStore} (or
 * has no color of their own). Must be deterministic so the sync plugin's readback
 * matches the mapper output.
 */
const userColorPalette: Array<{ light: string; dark: string }> = [
  { light: "#fff0c2", dark: "#8a6d1a" },
  { light: "#fcc9c3", dark: "#8a2e24" },
  { light: "#d4e8eb", dark: "#4a7178" },
  { light: "#c2eeff", dark: "#1a6e8a" },
  { light: "#bef3ff", dark: "#0a7a8a" },
];

/**
 * Pick a user-color from the {@link UserStore} based on user ids, falling back to
 * a deterministic palette entry when the (first) user isn't resolved yet or
 * carries no color of their own.
 *
 * The lookup is synchronous and deterministic given the store's current state,
 * which is what the sync plugin's readback requires. When a user later resolves
 * with their own color, the next reconcile picks it up.
 */
const colorsForUserIds = (
  userStore: UserStore,
  userIds: readonly string[] | undefined | null,
): { light: string; dark: string } => {
  if (!userIds || userIds.length === 0) {
    return userColorPalette[0];
  }
  const firstId = userIds[0];
  const user = userStore.getUser(firstId);
  if (user?.color && user.colorLight) {
    return { light: user.colorLight, dark: user.color };
  }
  return userColorPalette[hashStr(firstId) % userColorPalette.length];
};

/**
 * Build the mapper from a Y attribution to BlockNote's `y-attributed-*` mark
 * attrs, resolving user colors through the given {@link UserStore}.
 *
 * The mapper must be deterministic in `(format, attribution)` (for a fixed store
 * state) and emit attrs that exactly match the declared mark schema in
 * SuggestionMarks.ts. Any mismatch causes the sync plugin to fire phantom
 * reconcile dispatches in a loop. See ATTRIBUTION.md in @y/prosemirror.
 *
 * Declared attrs per mark (all three are the same shape):
 * - y-attributed-insert: { id, "user-color-light", "user-color-dark" }
 * - y-attributed-delete: { id, "user-color-light", "user-color-dark" }
 * - y-attributed-format: { id, "user-color-light", "user-color-dark" }
 */
export const createMapAttributionToMark =
  (userStore: UserStore) =>
  (
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
      const colors = colorsForUserIds(userStore, attribution.insert);
      out["y-attributed-insert"] = {
        userIds: attribution.insert,
        "user-color-light": colors.light,
        "user-color-dark": colors.dark,
      };
    }

    if (attribution.delete) {
      const colors = colorsForUserIds(userStore, attribution.delete);
      out["y-attributed-delete"] = {
        userIds: attribution.delete,
        "user-color-light": colors.light,
        "user-color-dark": colors.dark,
      };
    }

    if (attribution.format) {
      const userIds = [...new Set(Object.values(attribution.format).flat())];
      const colors = colorsForUserIds(userStore, userIds);
      out["y-attributed-format"] = {
        userIds,
        format: attribution.format,
        "user-color-light": colors.light,
        "user-color-dark": colors.dark,
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
      | "fragment"
      | "attributionManager"
      | "suggestionDoc"
      | "provider"
      | "resolveUsers"
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
          mapAttributionToMark: createMapAttributionToMark(userStore),
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
        YSuggestionMarksExtension(),
        SuggestionMarksExtension({ userStore }),
      ],
    } as const;
  },
);
