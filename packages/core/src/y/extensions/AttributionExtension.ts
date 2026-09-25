import { AddNodeMarkStep } from "prosemirror-transform";
import { getChangedRanges } from "@tiptap/core";
import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import {
  colorsForUserIds,
  userColorVarNames,
  userMarkColors,
  normalizeToUserStore,
  type UserStoreOrResolver,
} from "../../user/index.js";
import {
  resolveAttributionMarkClassName,
  getAttributionUserIds,
  YAttributionMarksExtension,
  type GetAttributionMarkClassName,
} from "./YAttributionMarks.js";

/** The attribution marks, mapped to their `modificationType`. */
const ATTRIBUTION_MARK_TYPES = {
  "y-attributed-insert": "insert",
  "y-attributed-delete": "delete",
  "y-attributed-format": "format",
  "y-attributed-attrs": "attrs",
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
 * The changed format keys from a modification mark's `data-format` (e.g.
 * `["bold", "italic"]`); `[]` if missing/malformed or an empty change. This is
 * the raw change context — turning it into a localized label (e.g.
 * `"Bold, Italic"`) is a view concern owned by the React layer's
 * `formatChangeLabel`, so core stays i18n-agnostic here.
 */
const parseFormatKeys = (formatJSON: string | undefined): string[] => {
  if (!formatJSON) {
    return [];
  }
  let format: unknown;
  try {
    format = JSON.parse(formatJSON);
  } catch {
    return [];
  }
  if (typeof format !== "object" || format === null) {
    return [];
  }
  return Object.keys(format);
};

/**
 * State for the currently-hovered suggestion mark's tooltip (`undefined` when
 * none). The extension computes it; a React controller renders + positions it
 * (see `AttributionTooltipController`).
 */
export type AttributionChange =
  | {
      modificationType: "insert" | "delete";
      format?: never;
      attributes?: never;
    }
  | { modificationType: "format"; format?: string[]; attributes?: never }
  | { modificationType: "attrs"; attributes: string[]; format?: never };

export type AttributionProvenance = "author" | "version";

export type AttributionTooltipState = AttributionChange & {
  /** The wrapper element the tooltip anchors to (floating-ui reference). */
  anchor: HTMLElement;
  /** Per-user background color, resolved from the user store (default path). */
  color: string;
  /** Whether the mark wraps inline content or a whole block. */
  contentType: "inline-content" | "block";
  /** Resolved usernames (falls back to raw ids), for custom renderers. */
  users: string[];
  /** Whether the labels identify document authors or a synthetic version. */
  provenance: AttributionProvenance;
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
    options,
  }: ExtensionOptions<
    | {
        /** Resolves authors to usernames. Optional; unresolved ids show raw. */
        resolveUsers?: UserStoreOrResolver;
        /** See {@link GetAttributionMarkClassName}. */
        getAttributionMarkClassName?: GetAttributionMarkClassName;
        /** Meaning of the identities carried by this extension's marks. */
        provenance?: AttributionProvenance;
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
      // Most changes are local (often several steps in one small span), so scan a
      // single range spanning all of them rather than each range individually.
      let from = Infinity;
      let to = -Infinity;
      for (const { newRange } of ranges) {
        from = Math.min(from, newRange.from);
        to = Math.max(to, newRange.to);
      }

      const ids = new Set<string>();
      // AddNodeMarkStep has an empty position map, so getChangedRanges cannot
      // locate its node. Load its authors directly from the added mark.
      for (const step of tr.steps) {
        if (
          step instanceof AddNodeMarkStep &&
          step.mark.type.name in ATTRIBUTION_MARK_TYPES
        ) {
          getAttributionUserIds(step.mark).forEach((id) => ids.add(id));
        }
      }
      if (ranges.length > 0) {
        tr.doc.nodesBetween(from, to, (node) => {
          for (const mark of node.marks) {
            if (
              ATTRIBUTION_MARK_TYPES[
                mark.type.name as keyof typeof ATTRIBUTION_MARK_TYPES
              ]
            ) {
              const userIds = getAttributionUserIds(mark);
              userIds?.forEach((id) => ids.add(id));
            }
          }
          return true;
        });
      }
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
            const colors = userMarkColors(user);
            if (colors) {
              dom.style.setProperty(light, colors.light);
              dom.style.setProperty(dark, colors.dark);
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

        // A stable identity string for a wrapper (empty if unattributed), used to
        // (a) test whether a mark is attributed and (b) group adjacent marks with
        // the *same* attribution under one tooltip. It's an internal grouping key,
        // not the displayed text — that's composed in the view from `users` and
        // the format label — so it's built from raw `data-*` (ids + format keys)
        // and stays free of i18n/username resolution.
        const attributionIdentity = (wrapper: HTMLElement) => {
          const ids = parseUserIds(wrapper.dataset["userIds"]);
          if (ids.length === 0 && wrapper.dataset["attributes"] === undefined) {
            return "";
          }
          const format = parseFormatKeys(wrapper.dataset["format"]);
          return `${wrapper.dataset["attributes"] ?? ""}:${format.join(",")}:${ids.join(",")}`;
        };

        // Build the tooltip state from a wrapper's `data-*` attributes.
        const buildState = (anchor: HTMLElement): AttributionTooltipState => {
          const change: AttributionChange =
            anchor.dataset["attributes"] !== undefined
              ? {
                  modificationType: "attrs",
                  attributes: parseFormatKeys(anchor.dataset["attributes"]),
                }
              : anchor.dataset["format"] !== undefined
                ? {
                    modificationType: "format",
                    format: parseFormatKeys(anchor.dataset["format"]),
                  }
                : {
                    modificationType:
                      anchor.tagName === "INS" ? "insert" : "delete",
                  };
          const { modificationType } = change;
          const contentType: AttributionTooltipState["contentType"] =
            anchor.dataset["inline"] === "false" ? "block" : "inline-content";

          return {
            anchor,
            // The tooltip is portaled outside the editor root, so it can't read
            // the cascaded per-user vars — resolve a concrete color from the store.
            color: colorsForUserIds(
              userStore,
              parseUserIds(anchor.dataset["userIds"]),
            ).dark,
            ...change,
            contentType,
            users: usersLabelArray(anchor.dataset["userIds"]),
            provenance: options?.provenance ?? "author",
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
            if (attributionIdentity(wrapper)) {
              return wrapper;
            }
            el = wrapper.parentElement;
          }
          return undefined;
        };

        const onPointerOver = (event: Event) => {
          const target = event.target instanceof Element ? event.target : null;
          const innermost =
            target && dom.contains(target)
              ? innermostAttributed(target)
              : undefined;
          if (!innermost) {
            // Not over an attributed mark — drop the current tooltip.
            hideTooltip();
            return;
          }

          const identity = attributionIdentity(innermost);
          // Anchor on the outermost ancestor with the *same* attribution so one
          // tooltip covers the whole region; a differently-attributed ancestor
          // breaks the chain, and unattributed ones are climbed past.
          let anchor = innermost;
          let el: Element | null = innermost.parentElement;
          while (el) {
            const ancestor = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
            if (!ancestor) {
              break;
            }
            const ancestorIdentity = attributionIdentity(ancestor);
            if (ancestorIdentity === identity) {
              anchor = ancestor;
            } else if (ancestorIdentity) {
              break;
            }
            el = ancestor.parentElement;
          }

          if (activeAnchor === anchor) {
            return;
          }

          activeAnchor = anchor;
          store.setState(buildState(anchor));

          // First hover renders raw ids (cache-only); load the authors and refresh
          // the resolved usernames once loaded, if this mark is still active.
          const ids = parseUserIds(anchor.dataset["userIds"]);
          if (ids.length > 0) {
            void userStore.loadUsers(ids).then(() => {
              if (activeAnchor !== anchor) {
                return;
              }
              store.setState(buildState(anchor));
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
