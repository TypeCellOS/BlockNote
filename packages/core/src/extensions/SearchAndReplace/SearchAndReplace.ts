import { closeHistory } from "@tiptap/pm/history";
import type { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import {
  createExtension,
  createStore,
  type ExtensionFactoryInstance,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { scrollAndHighlight } from "../../util/scrollAndHighlight.js";
import type {
  SearchAndReplaceMatch,
  SearchAndReplaceMatchChange,
  SearchAndReplaceMatcher,
  SearchAndReplaceOptions,
  SearchAndReplaceQuery,
  SearchAndReplaceRange,
  SearchAndReplaceState,
} from "./types.js";

type Match = {
  readonly from: number;
  readonly to: number;
  readonly handle: SearchAndReplaceMatch;
};
type Search<Query> = Omit<SearchAndReplaceState<Query>, "matches"> & {
  readonly matches: readonly Match[];
};

/** Literal, case-insensitive by default; offsets refer to the original text. */
export function defaultMatcher({
  query,
  text,
}: Parameters<
  SearchAndReplaceMatcher<SearchAndReplaceQuery>
>[0]): readonly SearchAndReplaceRange[] {
  if (!query.searchTerm) {
    return [];
  }
  const pattern = new RegExp(
    query.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    query.caseSensitive ? "gu" : "giu",
  );
  return Array.from(text.matchAll(pattern), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function scan<Query>(
  doc: Node,
  query: Query | null,
  matcher: SearchAndReplaceMatcher<Query>,
): Match[] {
  if (query === null) {
    return [];
  }
  const matches: Match[] = [];
  const activeQuery = query;

  function visit(node: Node, base: number, block?: Node) {
    const context = node.type.isInGroup("bnBlock") ? node : block;
    function getBlock() {
      if (!context) {
        throw new Error("Search text must belong to a BlockNote block");
      }
      return nodeToBlock(context, doc);
    }
    let text = "";
    let start = base;
    function flush() {
      if (!text) {
        return;
      }
      let previousEnd = 0;
      for (const range of matcher({ query: activeQuery, text, getBlock })) {
        if (
          !Number.isInteger(range.start) ||
          !Number.isInteger(range.end) ||
          range.start < previousEnd ||
          range.end <= range.start ||
          range.end > text.length
        ) {
          throw new Error(
            "Search matcher returned invalid or overlapping ranges",
          );
        }
        previousEnd = range.end;
        matches.push({
          from: start + range.start,
          to: start + range.end,
          handle: { getBlock },
        });
      }
      text = "";
    }
    node.forEach((child, offset) => {
      if (child.isText) {
        if (!text) {
          start = base + offset;
        }
        text += child.text;
      } else {
        // Marks join; blocks, cells, breaks and atoms separate searchable runs.
        flush();
        if (!child.isAtom) {
          visit(child, base + offset + 1, context);
        }
      }
    });
    flush();
  }
  visit(doc, 0);
  return matches;
}

function createSearchExtension<Query>(
  matcher: SearchAndReplaceMatcher<Query>,
  onMatchChange: (context: SearchAndReplaceMatchChange) => void = ({
    highlightMatch,
  }) => highlightMatch(),
) {
  return function instantiateSearchAndReplace({
    editor,
  }: Parameters<ExtensionFactoryInstance>[0]) {
    let current: Search<Query> = {
      query: null,
      matches: [],
      currentIndex: null,
    };
    let document: Node | undefined;
    let lastRender:
      | {
          doc: Node;
          source: Search<Query>;
          result: Search<Query>;
          decorations: DecorationSet;
        }
      | undefined;
    const store = createStore<SearchAndReplaceState<Query>>({
      ...current,
      matches: [],
    });

    function search(
      doc: Node,
      query: Query | null,
      from?: number,
    ): Search<Query> {
      const matches = scan(doc, query, matcher);
      const index =
        from === undefined
          ? 0
          : matches.findIndex((match) => match.from >= from);
      return {
        query,
        matches,
        currentIndex: matches.length ? Math.max(0, index) : null,
      };
    }

    function publish(
      next: Search<Query>,
      reason: SearchAndReplaceMatchChange["reason"],
      activeChanged: boolean,
    ) {
      current = next;
      store.setState({
        ...next,
        matches: next.matches.map((match) => match.handle),
      });
      if (current !== next) {
        return;
      }
      // Document changes already rendered their decorations before onChange.
      // Metadata redraws respect transaction filters; a rejected redraw leaves
      // existing decorations until the next accepted view update.
      if (reason !== "document") {
        editor.transact((tr) => tr.setMeta("searchAndReplace", true));
      }
      if (current !== next) {
        return;
      }
      let highlighted = false;
      onMatchChange({
        currentMatch:
          next.currentIndex === null
            ? null
            : next.matches[next.currentIndex].handle,
        totalMatches: next.matches.length,
        reason,
        highlightMatch() {
          if (
            current !== next ||
            !activeChanged ||
            highlighted ||
            !editor.domElement ||
            lastRender?.source !== next
          ) {
            return;
          }
          const target = editor.domElement.querySelector(
            '[data-search-match="active"]',
          );
          if (target) {
            highlighted = true;
            scrollAndHighlight(target);
          }
        },
      });
    }

    function refresh() {
      // `before` is installed content even within an outer editor.transact.
      const doc = editor.transact((tr) => tr.before);
      if (doc === document) {
        return;
      }
      // Keep the nearest match at or after the old position, without PM state.
      const from =
        current.currentIndex === null
          ? undefined
          : current.matches[current.currentIndex]?.from;
      const next =
        lastRender?.doc === doc && lastRender.source === current
          ? lastRender.result
          : search(doc, current.query, from);
      document = doc;
      const changed =
        (next.currentIndex === null
          ? undefined
          : next.matches[next.currentIndex]?.from) !== from;
      // The accepted render now belongs to the published snapshot.
      if (lastRender?.result === next) {
        lastRender.source = next;
      }
      publish(next, "document", changed);
    }

    function setQuery(query: Query | null) {
      const doc = editor.transact((tr) => tr.before);
      document = doc;
      const next = search(doc, query);
      publish(next, "query", next.currentIndex !== null);
    }

    function navigate(direction: 1 | -1) {
      if (!current.matches.length) {
        return false;
      }
      const currentIndex =
        ((current.currentIndex ?? 0) + direction + current.matches.length) %
        current.matches.length;
      // Explicit navigation also reveals a sole match; ordinary refreshes do not.
      publish({ ...current, currentIndex }, "navigation", true);
      return true;
    }

    function replace(replacement: string, all: boolean) {
      if (!editor.isEditable) {
        return;
      }
      editor.transact((tr) => {
        const from =
          current.currentIndex === null
            ? undefined
            : current.matches[current.currentIndex]?.from;
        const pending = search(
          tr.doc,
          current.query,
          from === undefined ? undefined : tr.mapping.map(from, 1),
        );
        const matches = all
          ? pending.matches
          : pending.currentIndex === null
            ? []
            : [pending.matches[pending.currentIndex]];
        if (!matches.length) {
          return;
        }
        closeHistory(tr);
        for (const match of [...matches].reverse()) {
          const { from, to } = match;
          const text = replacement
            ? tr.doc.type.schema.text(
                replacement,
                tr.doc.resolve(from).nodeAfter?.marks,
              )
            : [];
          tr.replaceWith(from, to, text);
        }
      });
    }

    const prosemirrorPlugins: readonly Plugin<void>[] = [
      new Plugin<void>({
        props: {
          decorations(state) {
            if (
              lastRender?.doc === state.doc &&
              lastRender.source === current
            ) {
              return lastRender.decorations;
            }
            // Before onChange, derive decorations locally without publishing pending matches.
            const result =
              state.doc === document
                ? current
                : search(
                    state.doc,
                    current.query,
                    current.currentIndex === null
                      ? undefined
                      : current.matches[current.currentIndex]?.from,
                  );
            lastRender = {
              doc: state.doc,
              source: current,
              result,
              decorations: result.matches.length
                ? DecorationSet.create(
                    state.doc,
                    result.matches.map(({ from, to }, index) => {
                      const active = index === result.currentIndex;
                      const color = active ? "yellow" : "blue";
                      return Decoration.inline(from, to, {
                        class: active
                          ? "bn-search-match bn-search-match-active"
                          : "bn-search-match",
                        style: `background-color: var(--bn-colors-highlights-${color}-background); color: var(--bn-colors-highlights-${color}-text);`,
                        "data-search-match": active ? "active" : "true",
                      });
                    }),
                  )
                : DecorationSet.empty,
            };
            return lastRender.decorations;
          },
        },
      }),
    ];

    return {
      key: "searchAndReplace",
      store,
      mount() {
        return editor.onChange(() => refresh());
      },
      /** Atomically set an immutable query, activating its first match without editing content. */
      setQuery(query: Query) {
        setQuery(query);
      },
      /** Activate the next match, wrapping; false when no matches exist. */
      nextMatch() {
        return navigate(1);
      },
      /** Activate the previous match, wrapping; false when no matches exist. */
      previousMatch() {
        return navigate(-1);
      },
      /** Replace the active match with literal text (empty deletes), inheriting its first marks.
       * One undoable edit, subject to filters/outer transactions; read-only editors are unchanged. */
      replace(replacement: string) {
        replace(replacement, false);
      },
      /** Replace original matches once in one undoable edit, inheriting each match's first marks.
       * Literal text (empty deletes); subject to filters/outer transactions; read-only is unchanged. */
      replaceAll(replacement: string) {
        replace(replacement, true);
      },
      /** Clear the query, matches and decorations without changing document content or history. */
      clearSearch() {
        setQuery(null);
      },
      prosemirrorPlugins,
    } as const;
  };
}

/**
 * Optional native search extension. Custom queries are inferred from matcher.
 * Specialize the factory for typed lookup: `SearchAndReplaceExtension<MyQuery>`.
 * Search preferences live outside document history. Document changes synchronize
 * while mounted; headless queries scan explicitly.
 */
export const SearchAndReplaceExtension = createExtension(function <Query>({
  editor,
  options,
}: ExtensionOptions<
  | SearchAndReplaceOptions<Query>
  | Omit<SearchAndReplaceOptions<SearchAndReplaceQuery>, "matcher">
  | undefined
>) {
  // createExtension owns runtime factory identity. Its conditional return type
  // erases the generic query parameter, so the assertion restores public call
  // signatures; both branches use the same native construction.
  return options && "matcher" in options
    ? createSearchExtension(options.matcher, options.onMatchChange)({ editor })
    : createSearchExtension(defaultMatcher, options?.onMatchChange)({ editor });
}) as {
  <Query>(
    options: SearchAndReplaceOptions<Query>,
  ): ReturnType<typeof createSearchExtension<Query>>;
  (
    options?: Omit<SearchAndReplaceOptions<SearchAndReplaceQuery>, "matcher">,
  ): ReturnType<typeof createSearchExtension<SearchAndReplaceQuery>>;
};
