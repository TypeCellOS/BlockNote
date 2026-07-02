import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
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
import { colorsForUserIds } from "./userColors.js";
import {
  resolveAttributionMarkClassName,
  YAttributionMarksExtension,
  type GetAttributionMarkClassName,
} from "./YAttributionMarks.js";

/**
 * The three attribution marks, mapped to the `modificationType` reported to
 * {@link GetAttributionMarkClassName} (`y-attributed-format` → `"format"`).
 */
const ATTRIBUTION_MARK_TYPES = {
  "y-attributed-insert": "insert",
  "y-attributed-delete": "delete",
  "y-attributed-format": "format",
} as const;

const COLOR_PLUGIN_KEY = new PluginKey("suggestionMarkColors");

/**
 * Selector for the wrapper element of an attribution mark (insert / delete /
 * modification). Every such wrapper carries the author(s) in its `data-user-ids`
 * attribute (see `YAttributionMarks.ts`), which is all we need to resolve the
 * tooltip — so this extension reads attribution straight from the DOM rather
 * than keeping a separate registry of marks. Colors are resolved separately from
 * the user store (they're intentionally not on the mark, see `userColors.ts`).
 */
const ATTRIBUTION_MARK_SELECTOR = "[data-user-ids]";

/**
 * Parse the JSON-encoded `data-user-ids` attribute into an array of user-id
 * strings. Returns an empty array when the attribute is missing, malformed, or
 * carries no ids.
 */
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
 * Human-readable label for a modification mark's `data-format` attribute, which
 * describes which formatting marks changed (e.g. `{ bold: {}, italic: {} }`).
 * Each key is looked up in the formatting toolbar dictionary so the label is
 * localized (e.g. `"Bold, Italic"`). If the format is missing, empty, or
 * contains any change we don't have a translation for, the localized generic
 * fallback (`"Formatting Change"`) is used instead.
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
 * The on-screen box the tooltip should anchor to. For block-level marks the
 * wrapper's content span is `display: contents` and has no box of its own, so
 * fall back to its first rendered child. Exported so the React controller can
 * build a live `getBoundingClientRect` for floating-ui.
 */
export const getReferenceRect = (wrapper: Element): DOMRect => {
  // The wrapper itself is `display: contents`; its first child is the content
  // span that carries the highlight.
  const content = wrapper.firstElementChild ?? wrapper;
  const rect = content.getBoundingClientRect();
  if (rect.width || rect.height) {
    return rect;
  }
  return content.firstElementChild?.getBoundingClientRect() ?? rect;
};

/**
 * The state emitted for the attribution tooltip of the currently-hovered
 * suggestion mark, or `undefined` when nothing attributed is hovered. The
 * extension computes this; a React controller subscribes to it and renders +
 * positions the tooltip (see `AttributionTooltipController`), so this
 * extension stays agnostic about how the tooltip is displayed.
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
 * Resolves the attribution tooltip state for suggestion marks (`<ins>` /
 * `<del>` / modification) on hover, exposing it through a store for React to
 * render.
 *
 * Attribution marks nest: a delete can sit inside an insert, and two overlapping
 * suggestions wrap the same text. With per-mark hover listeners both the parent
 * and child would each show their own tooltip. Instead this extension installs a
 * single delegated `mouseover` listener on the editor root and, on each move,
 * finds the *closest* attribution wrapper to the pointer (`Element.closest`).
 * Because `closest` returns the nearest ancestor, the innermost mark always wins
 * and children take priority over their parents.
 *
 * State lives on this per-editor extension instance (a store) rather than in
 * module scope, so multiple editors on a page don't share one registry.
 */
export const AttributionExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<
    | {
        /**
         * Resolves suggestion authors to usernames. Optional: an editor that
         * renders suggestion marks without attribution (e.g. the AI path) omits
         * it, and unresolved ids simply show as raw ids.
         */
        resolveUsers?: UserStoreOrResolver;
        /** See {@link GetAttributionMarkClassName}. */
        getAttributionMarkClassName?: GetAttributionMarkClassName;
      }
    | undefined
  >) => {
    const userStore = normalizeToUserStore(options?.resolveUsers);
    const getAttributionMarkClassName = options?.getAttributionMarkClassName;

    const store = createStore<AttributionTooltipState | undefined>(undefined);

    // Build the mark-color decorations for a document. Suggestion marks carry
    // only `userIds` (kept deterministic for the Yjs sync reconcile); the author
    // color is resolved here from the user store and applied as the
    // `--user-color-*` custom properties the Block.css rules read. Inline marks
    // get an inline decoration around their text; block-level marks get a node
    // decoration on the wrapped block. When an app supplies a
    // `getAttributionMarkClassName` class for a mark, that class owns styling, so
    // no per-user color decoration is emitted for it.
    const buildColorDecorations = (doc: Node): DecorationSet => {
      const decorations: Decoration[] = [];
      const idsToLoad = new Set<string>();

      doc.descendants((node, pos) => {
        for (const mark of node.marks) {
          const modificationType =
            ATTRIBUTION_MARK_TYPES[
              mark.type.name as keyof typeof ATTRIBUTION_MARK_TYPES
            ];
          if (!modificationType) {
            continue;
          }

          const userIds = mark.attrs["userIds"] as string[] | null;
          if (userIds) {
            userIds.forEach((id) => idsToLoad.add(id));
          }

          const contentType = node.isInline ? "inline-content" : "block";
          const overrideClass = resolveAttributionMarkClassName(
            getAttributionMarkClassName?.({ contentType, modificationType }),
            "content",
          );
          if (overrideClass) {
            continue;
          }

          const colors = colorsForUserIds(userStore, userIds);
          const style = `--user-color-light: ${colors.light}; --user-color-dark: ${colors.dark};`;
          if (node.isInline) {
            // An inline decoration wraps the marked text in a span *inside* the
            // mark view's content span, so the `--user-color-*` here would land
            // below the paint element and never reach it. Instead this span
            // *becomes* the painted element: it carries the same
            // `.bn-suggestion-mark(--delete)` class the mark view used to paint
            // with (the mark view now keeps its own span structural), so the
            // existing Block.css rules resolve the colors on the element that
            // actually has them. The `data-type="modification"` marker still
            // lives on the (ancestor) mark wrapper, so those rules keep working.
            const markClass =
              modificationType === "delete"
                ? "bn-suggestion-mark bn-suggestion-mark--delete"
                : "bn-suggestion-mark";
            decorations.push(
              Decoration.inline(pos, pos + node.nodeSize, {
                class: markClass,
                style,
              }),
            );
          } else {
            // A node decoration applies its style to the block node's own DOM —
            // which is exactly the `.bn-suggestion-node > *` element Block.css
            // paints — so the colors land where they're read with no extra span.
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, { style }),
            );
          }
        }
      });

      // Kick off resolution for any authors we haven't seen; when they land the
      // store subscription below rebuilds the decorations with the real colors.
      if (idsToLoad.size > 0) {
        void userStore.loadUsers(Array.from(idsToLoad));
      }

      return DecorationSet.create(doc, decorations);
    };

    return {
      key: "attribution",
      userStore,
      store,
      prosemirrorPlugins: [
        new Plugin<DecorationSet>({
          key: COLOR_PLUGIN_KEY,
          state: {
            init: (_config, state) => buildColorDecorations(state.doc),
            apply: (tr, value) =>
              tr.docChanged || tr.getMeta(COLOR_PLUGIN_KEY)
                ? buildColorDecorations(tr.doc)
                : value,
          },
          props: {
            decorations(state) {
              return COLOR_PLUGIN_KEY.getState(state) ?? DecorationSet.empty;
            },
          },
        }),
      ],
      mount({ root, signal }) {
        // The wrapper currently showing a tooltip, tracked so we don't re-emit
        // state on every `mouseover` while the pointer stays on the same mark.
        let activeAnchor: HTMLElement | undefined;

        // Resolve the JSON-encoded `data-user-ids` of a mark into usernames,
        // mapping each id to its username when the user is cached, otherwise
        // leaving the raw id (so a failed lookup, or an empty store, is
        // visible). `getUser` is cache-only; ids are loaded asynchronously on
        // hover (see `onPointerOver`).
        const usersLabelArray = (userIdsJSON: string | undefined): string[] =>
          parseUserIds(userIdsJSON).map(
            (id) => userStore.getUser(id)?.username ?? id,
          );

        // The text shown for an attribution wrapper (empty when it carries no
        // attribution, e.g. a null `userIds`). Modification marks carry a
        // `data-format` attribute describing which formatting changed; for those
        // the author(s) are prefixed with a localized label of the change, e.g.
        // `"Bold: Alice"` or `"Formatting Change: Alice"`.
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

        // Build the full tooltip state from a wrapper and its resolved text,
        // reading the mark's kind / content-type / colors straight from its
        // `data-*` attributes.
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
            // Colors are no longer stored on the mark/DOM — resolve the author
            // color from the user store the same way the mark-color decoration
            // does, so the tooltip and the highlight always agree.
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

        // The innermost attributed mark at or above `el`. `closest` returns the
        // nearest ancestor (or self) matching the selector; wrappers without
        // attribution are skipped so an attributed parent still wins.
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
          // De-duplicate nested identical tooltips: if an enclosing mark would
          // show the exact same text, anchor on the *outermost* such ancestor so
          // a single tooltip covers the whole region instead of re-anchoring to
          // the smaller child. We only keep the child's tooltip when an enclosing
          // mark has genuinely *different* content (a different author), which
          // breaks the chain. Empty-attribution ancestors carry no tooltip, so
          // they're transparent and we climb past them.
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

          // Still hovering the same mark — nothing to re-emit. The initial hover
          // already triggered the async username refresh below.
          if (activeAnchor === anchor) {
            return;
          }

          activeAnchor = anchor;
          store.setState(buildState(anchor, text));

          // `getUser` only reads the cache, so the first hover for a given author
          // renders the raw id. Load the users behind this mark and, once
          // resolved, refresh the tooltip text if it's still the active one.
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

        // When users resolve (their real colors land in the store — whether
        // fetched here, on hover, or by comments/versioning sharing this cache),
        // rebuild the mark-color decorations so the highlights recolor from the
        // fallback palette to the author's own color. `docChanged` alone can't
        // catch this since the colors live outside the doc.
        const unsubscribe = userStore.store.subscribe(() => {
          editor.transact((tr) => tr.setMeta(COLOR_PLUGIN_KEY, true));
        });
        signal.addEventListener("abort", unsubscribe);
      },

      // The `y-attributed-*` suggestion marks aren't part of the default schema
      // — they're only needed with collaboration. Register them here (so the
      // block node specs can allow them), along with the attribution tooltip
      // shown when hovering a suggestion mark.
      blockNoteExtensions: [
        YAttributionMarksExtension({
          getAttributionMarkClassName: options?.getAttributionMarkClassName,
        }),
      ],
    };
  },
);
