import { getChangedRanges } from "@tiptap/core";
import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import type { Dictionary } from "../../i18n/dictionary.js";
import {
  normalizeToUserStore,
  type UserStoreOrResolver,
} from "../../user/index.js";
import { colorsForUserIds, userColorVarNames } from "./userColors.js";
import {
  resolveAttributionMarkClassName,
  YAttributionMarksExtension,
  type GetAttributionMarkClassName,
} from "./YAttributionMarks.js";

/** The attribution marks, mapped to their `modificationType`. */
const ATTRIBUTION_MARK_TYPES = {
  "y-attributed-insert": "insert",
  "y-attributed-delete": "delete",
  "y-attributed-format": "format",
} as const;

const ATTRIBUTION_LOAD_PLUGIN_KEY = new PluginKey("attributionLoadUsers");

/** Wrapper of an attribution mark; carries its author(s) in `data-user-ids`. */
const ATTRIBUTION_MARK_SELECTOR = "[data-user-ids]";

/** Parse the JSON-encoded `data-user-ids` attribute; `[]` if missing/malformed. */
const parseUserIds = (userIdsJSON: string | undefined): string[] => {
  if (!userIdsJSON) {
    return [];
  }
  let userIds: unknown;
  try {
    userIds = JSON.parse(userIdsJSON);
  } catch {
    return [];
  }
  return Array.isArray(userIds) ? userIds.map(String) : [];
};

/**
 * Localized label for a modification mark's `data-format` (e.g. `"Bold, Italic"`),
 * looking each changed format up in the toolbar dictionary. Falls back to the
 * generic `"Formatting Change"` if any key is missing a translation.
 */
const formatChangeLabel = (
  formatJSON: string | undefined,
  dictionary: Dictionary,
): string => {
  const fallback = dictionary.suggestion_changes.formatting_change;
  if (!formatJSON) {
    return fallback;
  }
  let format: unknown;
  try {
    format = JSON.parse(formatJSON);
  } catch {
    return fallback;
  }
  if (typeof format !== "object" || format === null) {
    return fallback;
  }
  const keys = Object.keys(format);
  if (keys.length === 0) {
    return fallback;
  }
  const toolbar = dictionary.formatting_toolbar as Record<string, unknown>;
  const names: string[] = [];
  for (const key of keys) {
    const entry = toolbar[key];
    const tooltip =
      entry && typeof entry === "object" && "tooltip" in entry
        ? (entry as { tooltip: unknown }).tooltip
        : undefined;
    if (typeof tooltip !== "string") {
      return fallback;
    }
    names.push(tooltip);
  }
  return names.join(", ");
};

/**
 * The box the tooltip anchors to. The wrapper is `display: contents` (no box of
 * its own), so use its content span child, falling back further for block marks.
 * Exported for the React controller's floating-ui `getBoundingClientRect`.
 */
export const getReferenceRect = (wrapper: Element): DOMRect => {
  const content = wrapper.firstElementChild ?? wrapper;
  const rect = content.getBoundingClientRect();
  if (rect.width || rect.height) {
    return rect;
  }
  return content.firstElementChild?.getBoundingClientRect() ?? rect;
};

/**
 * State for the currently-hovered suggestion mark's tooltip (`undefined` when
 * none). The extension computes it; a React controller renders + positions it
 * (see `AttributionTooltipController`).
 */
export type AttributionTooltipState = {
  /** The wrapper element the tooltip anchors to (floating-ui reference). */
  anchor: HTMLElement;
  /** Resolved display text (localized format label + usernames). */
  text: string;
  /** Per-user background color, resolved from the user store (default path). */
  color: string;
  /** The kind of change — `format` is the modification mark. */
  modificationType: "insert" | "delete" | "format";
  /** Whether the mark wraps inline content or a whole block. */
  contentType: "inline-content" | "block";
  /** Resolved usernames (falls back to raw ids), for custom renderers. */
  users: string[];
  /** Localized formatting-change label, present only for `format` marks. */
  formatLabel?: string;
  /**
   * Class name from the `getAttributionMarkClassName` callback (override path).
   * When present, the tooltip applies this and skips the inline `color`.
   */
  className?: string;
};

/**
 * Resolves the attribution tooltip state for suggestion marks on hover (exposed
 * via a store for React), and loads each mark's author so its color/username
 * resolves. Marks nest, so a single delegated `mouseover` listener picks the
 * `closest` wrapper to the pointer — the innermost mark wins.
 */
export const AttributionExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<
    | {
        /** Resolves authors to usernames. Optional; unresolved ids show raw. */
        resolveUsers?: UserStoreOrResolver;
        /** See {@link GetAttributionMarkClassName}. */
        getAttributionMarkClassName?: GetAttributionMarkClassName;
      }
    | undefined
  >) => {
    const userStore = normalizeToUserStore(options?.resolveUsers);
    const getAttributionMarkClassName = options?.getAttributionMarkClassName;

    const store = createStore<AttributionTooltipState | undefined>(undefined);

    // Load the authors of the attribution marks in `tr`'s changed ranges, so
    // their colors/usernames resolve (colors then flow to marks via `syncRootVars`).
    // `getChangedRanges` covers mark-only steps too — which suggestion mode adds
    // over existing text and `tr.changedRange()` would miss.
    const loadChangedUsers = (tr: Transaction) => {
      const ranges = getChangedRanges(tr);
      if (ranges.length === 0) {
        return;
      }
      // Most changes are local (often several steps in one small span), so scan a
      // single range spanning all of them rather than each range individually.
      let from = Infinity;
      let to = -Infinity;
      for (const { newRange } of ranges) {
        from = Math.min(from, newRange.from);
        to = Math.max(to, newRange.to);
      }

      const ids = new Set<string>();
      tr.doc.nodesBetween(from, to, (node) => {
        for (const mark of node.marks) {
          if (
            ATTRIBUTION_MARK_TYPES[
              mark.type.name as keyof typeof ATTRIBUTION_MARK_TYPES
            ]
          ) {
            const userIds = mark.attrs["userIds"] as string[] | null;
            userIds?.forEach((id) => ids.add(id));
          }
        }
        return true;
      });
      if (ids.size > 0) {
        void userStore.loadUsers(Array.from(ids));
      }
    };

    return {
      key: "attribution",
      userStore,
      store,
      prosemirrorPlugins: [
        // Marks arrive in a transaction (suggestion mode, viewing suggestions,
        // version preview), so resolve their authors as the doc changes.
        new Plugin({
          key: ATTRIBUTION_LOAD_PLUGIN_KEY,
          state: {
            init: () => null,
            apply: (tr) => {
              if (tr.docChanged) {
                loadChangedUsers(tr);
              }
              return null;
            },
          },
        }),
      ],
      mount({ dom, root, signal }) {
        // Write each resolved author's color to the editor root as per-user CSS
        // variables (`--user-color-<id>-{light,dark}`) that the mark wrappers read
        // via `var(..., <fallback>)`, so the cascade recolors marks once a color
        // resolves. Color-less users have theirs removed so the fallback applies.
        const syncRootVars = () => {
          for (const [id, user] of userStore.store.state) {
            const { light, dark } = userColorVarNames(id);
            if (user.color && user.colorLight) {
              dom.style.setProperty(light, user.colorLight);
              dom.style.setProperty(dark, user.color);
            } else {
              dom.style.removeProperty(light);
              dom.style.removeProperty(dark);
            }
          }
        };

        // The wrapper currently showing a tooltip, so we don't re-emit on every
        // `mouseover` over the same mark.
        let activeAnchor: HTMLElement | undefined;

        // The mark's authors as usernames, falling back to the raw id when not
        // cached (`getUser` is cache-only; ids load on hover, see `onPointerOver`).
        const usersLabelArray = (userIdsJSON: string | undefined): string[] =>
          parseUserIds(userIdsJSON).map(
            (id) => userStore.getUser(id)?.username ?? id,
          );

        // The tooltip text for a wrapper (empty if unattributed). Modification
        // marks prefix the authors with a localized change label, e.g.
        // `"Bold: Alice"`.
        const attributionText = (wrapper: HTMLElement) => {
          const users = usersLabelArray(wrapper.dataset["userIds"]).join(", ");
          if (!users) {
            return "";
          }
          if (wrapper.dataset["format"] !== undefined) {
            const label = formatChangeLabel(
              wrapper.dataset["format"],
              editor.dictionary,
            );
            return `${label}: ${users}`;
          }
          return users;
        };

        // Build the tooltip state from a wrapper's `data-*` attributes and text.
        const buildState = (
          anchor: HTMLElement,
          text: string,
        ): AttributionTooltipState => {
          const isModification = anchor.dataset["format"] !== undefined;
          const modificationType: AttributionTooltipState["modificationType"] =
            isModification
              ? "format"
              : anchor.tagName === "INS"
                ? "insert"
                : "delete";
          const contentType: AttributionTooltipState["contentType"] =
            anchor.dataset["inline"] === "false" ? "block" : "inline-content";

          return {
            anchor,
            text,
            // The tooltip is portaled outside the editor root, so it can't read
            // the cascaded per-user vars — resolve a concrete color from the store.
            color: colorsForUserIds(
              userStore,
              parseUserIds(anchor.dataset["userIds"]),
            ).dark,
            modificationType,
            contentType,
            users: usersLabelArray(anchor.dataset["userIds"]),
            formatLabel: isModification
              ? formatChangeLabel(anchor.dataset["format"], editor.dictionary)
              : undefined,
            className: resolveAttributionMarkClassName(
              getAttributionMarkClassName?.({ contentType, modificationType }),
              "tooltip",
            ),
          };
        };

        const hideTooltip = () => {
          if (!activeAnchor) {
            return;
          }
          activeAnchor = undefined;
          store.setState(undefined);
        };

        // The innermost attributed mark at or above `el`, skipping unattributed
        // wrappers so an attributed ancestor still wins.
        const innermostAttributed = (
          el: Element | null,
        ): HTMLElement | undefined => {
          while (el) {
            const wrapper = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
            if (!wrapper) {
              return undefined;
            }
            if (attributionText(wrapper)) {
              return wrapper;
            }
            el = wrapper.parentElement;
          }
          return undefined;
        };

        const onPointerOver = (event: Event) => {
          const target = event.target instanceof Element ? event.target : null;
          const innermost = innermostAttributed(target);
          if (!innermost) {
            // Not over an attributed mark — drop the current tooltip.
            hideTooltip();
            return;
          }

          const text = attributionText(innermost);
          // Anchor on the outermost ancestor with the *same* text so one tooltip
          // covers the whole region; a differently-attributed ancestor breaks the
          // chain, and unattributed ones are climbed past.
          let anchor = innermost;
          let el: Element | null = innermost.parentElement;
          while (el) {
            const ancestor = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
            if (!ancestor) {
              break;
            }
            const ancestorText = attributionText(ancestor);
            if (ancestorText === text) {
              anchor = ancestor;
            } else if (ancestorText) {
              break;
            }
            el = ancestor.parentElement;
          }

          if (activeAnchor === anchor) {
            return;
          }

          activeAnchor = anchor;
          store.setState(buildState(anchor, text));

          // First hover renders raw ids (cache-only); load the authors and refresh
          // the text once resolved, if this mark is still active.
          const ids = parseUserIds(anchor.dataset["userIds"]);
          if (ids.length > 0) {
            void userStore.loadUsers(ids).then(() => {
              if (activeAnchor !== anchor) {
                return;
              }
              const refreshed = attributionText(anchor);
              if (refreshed) {
                store.setState(buildState(anchor, refreshed));
              }
            });
          }
        };

        root.addEventListener("mouseover", onPointerOver, { signal });
        signal.addEventListener("abort", hideTooltip);

        // Seed from the cache, then keep the vars in sync as users resolve.
        syncRootVars();
        const unsubscribe = userStore.store.subscribe(syncRootVars);
        signal.addEventListener("abort", unsubscribe);
      },

      // The `y-attributed-*` marks aren't in the default schema — register them
      // here so the block specs can allow them (collaboration-only).
      blockNoteExtensions: [
        YAttributionMarksExtension({
          getAttributionMarkClassName: options?.getAttributionMarkClassName,
        }),
      ],
    };
  },
);
