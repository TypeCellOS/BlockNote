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
  type AttributionMarkStyleInfo,
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
      // `change`: a preview (e.g. a diagram) can't show what was inserted or
      // deleted in its hidden source, only that it changed.
      // `move`: a moved block at its new place, or its struck-through original.
      modificationType: "insert" | "delete" | "change" | "move";
      format?: never;
      attributes?: never;
    }
  | { modificationType: "format"; format?: string[]; attributes?: never }
  | { modificationType: "attrs"; attributes: string[]; format?: never };

export type AttributionTooltipState = AttributionChange & {
  /** The wrapper element the tooltip anchors to (floating-ui reference). */
  anchor: HTMLElement;
  /** Visible surface when its attribution mark covers separately rendered source. */
  reference?: Element;
  /** Per-user background color, resolved from the user store (default path). */
  color: string;
  /** Whether the mark wraps inline content or a whole block. */
  contentType: "inline-content" | "block";
  /**
   * Resolved usernames (falls back to raw ids), for custom renderers. Empty
   * when the change has no named author, e.g. in a version diff.
   */
  users: string[];
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
        // A user with an empty name only colors its marks (a version diff's
        // synthetic author), so it isn't listed.
        const usersLabelArray = (userIdsJSON: string | undefined): string[] =>
          parseUserIds(userIdsJSON)
            .map((id) => userStore.getUser(id)?.username ?? id)
            .filter((username) => username !== "");

        // A stable identity string for a mark wrapper, used to group nested marks
        // with the *same* change under one tooltip. Every wrapper is a change;
        // its author may be unknown (e.g. content removed along with a
        // concurrently deleted block). It's an internal grouping key, not the
        // displayed text, so it's built from raw `data-*` and stays free of
        // i18n/username resolution.
        const attributionIdentity = (wrapper: HTMLElement) => {
          const ids = parseUserIds(wrapper.dataset["userIds"]);
          const format = parseFormatKeys(wrapper.dataset["format"]);
          const moved = wrapper.dataset["moved"] !== undefined ? "moved" : "";
          return `${wrapper.tagName}${moved}:${wrapper.dataset["attributes"] ?? ""}:${format.join(",")}:${ids.join(",")}`;
        };

        // Build the tooltip state from a wrapper's `data-*` attributes. A
        // `preview` is the rendered preview the change was hovered through.
        const buildState = (
          anchor: HTMLElement,
          preview?: Element,
        ): AttributionTooltipState => {
          const markChange: AttributionChange & {
            modificationType:
              | AttributionMarkStyleInfo["modificationType"]
              | "move";
          } =
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
                      anchor.dataset["moved"] !== undefined
                        ? "move"
                        : anchor.tagName === "INS"
                          ? "insert"
                          : "delete",
                  };
          // For styling, a moved block is inserted at its new place and
          // deleted at its old one.
          const modificationType =
            markChange.modificationType === "move"
              ? anchor.tagName === "INS"
                ? "insert"
                : "delete"
              : markChange.modificationType;
          const change: AttributionChange = preview
            ? { modificationType: "change" }
            : markChange;
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
            className: resolveAttributionMarkClassName(
              getAttributionMarkClassName?.({ contentType, modificationType }),
              "tooltip",
            ),
            ...(preview ? { reference: preview } : {}),
          };
        };

        const hideTooltip = () => {
          if (!activeAnchor) {
            return;
          }
          activeAnchor = undefined;
          store.setState(undefined);
        };

        const nodeAttribution = (
          target: Element,
        ): { mark: HTMLElement; preview: Element } | undefined => {
          if (!dom.contains(target)) {
            return undefined;
          }
          const view = editor.prosemirrorView;
          const $pos = view.state.doc.resolve(view.posAtDOM(target, 0));
          if ($pos.depth === 0) {
            return undefined;
          }
          const owner = view.nodeDOM($pos.before($pos.depth));
          if (!(owner instanceof Element) || !owner.contains(target)) {
            return undefined;
          }
          const contentDOM = view.domAtPos($pos.start()).node;
          if (contentDOM.contains(target) || target.contains(contentDOM)) {
            // Editable content already shows inline attribution. Unchanged text
            // and the containing block must not inherit a sibling's change.
            return undefined;
          }
          // A separate rendered preview may hide its attributed source. Only
          // hovering that surface represents a change within the whole node,
          // not other controls like a checkbox, whose text is on screen.
          const name = $pos.parent.type.name;
          const hasPreview =
            editor.schema.blockSpecs[name]?.implementation?.meta?.hasPreview ||
            editor.schema.inlineContentSpecs[name]?.implementation?.meta
              ?.hasPreview;
          if (
            !hasPreview &&
            contentDOM instanceof Element &&
            contentDOM.getClientRects().length > 0
          ) {
            return undefined;
          }
          const mark = owner.querySelector<HTMLElement>(
            ATTRIBUTION_MARK_SELECTOR,
          );
          return mark ? { mark, preview: owner } : undefined;
        };

        const onPointerOver = (event: Event) => {
          const target = event.target instanceof Element ? event.target : null;
          const hoveredMark =
            target && dom.contains(target)
              ? (target.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR) ??
                undefined)
              : undefined;
          const fallback =
            target && !hoveredMark ? nodeAttribution(target) : undefined;
          const innermost = hoveredMark ?? fallback?.mark;
          if (!innermost) {
            // Not over an attributed mark — drop the current tooltip.
            hideTooltip();
            return;
          }

          const identity = attributionIdentity(innermost);
          // Anchor on the outermost ancestor with the *same* attribution so one
          // tooltip covers the whole region; a different ancestor breaks the chain.
          let anchor = innermost;
          let el: Element | null = innermost.parentElement;
          while (el) {
            const ancestor = el.closest<HTMLElement>(ATTRIBUTION_MARK_SELECTOR);
            if (!ancestor) {
              break;
            }
            if (attributionIdentity(ancestor) !== identity) {
              break;
            }
            anchor = ancestor;
            el = ancestor.parentElement;
          }

          if (
            activeAnchor === anchor &&
            store.state?.reference === fallback?.preview
          ) {
            return;
          }

          activeAnchor = anchor;
          store.setState(buildState(anchor, fallback?.preview));

          // First hover renders raw ids (cache-only); load the authors and refresh
          // the resolved usernames once loaded, if this mark is still active.
          const ids = parseUserIds(anchor.dataset["userIds"]);
          if (ids.length > 0) {
            void userStore.loadUsers(ids).then(() => {
              if (
                activeAnchor !== anchor ||
                store.state?.reference !== fallback?.preview
              ) {
                return;
              }
              store.setState(buildState(anchor, fallback?.preview));
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
