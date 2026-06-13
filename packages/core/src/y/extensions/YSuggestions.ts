import {
  Diff,
  MapDiffArgs,
  ySuggestionDecorationPlugin,
  editableDeletionWidget,
} from "@y/prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { Decoration, DecorationAttrs } from "prosemirror-view";
import {
  DOMSerializer,
  Fragment,
  Node,
  NodeType,
  Schema,
} from "prosemirror-model";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";


/**
 * Reconstruct removed content as a non-editable DOM node by serializing the
 * Fragment to HTML. Works for inline text and for whole block nodes alike.
 */
export const renderDeletedContent = (
  fragment: Fragment,
  schema: Schema,
  opts: { authorIds?: string[]; color?: string; title?: string } = {},
): HTMLElement => {
  const serializer = DOMSerializer.fromSchema(schema);
  const isBlock = fragment?.firstChild?.isBlock ?? false;
  const container = document.createElement(isBlock ? "div" : "span");
  container.className = "pm-suggest pm-suggest--delete";
  container.setAttribute(
    "data-diff-type",
    isBlock ? "block-delete" : "inline-delete",
  );
  if (opts.authorIds?.length) {
    container.setAttribute("data-diff-user-id", opts.authorIds.join(","));
  }
  if (opts.color) {
    container.style.setProperty("--author-color", opts.color);
  }
  if (opts.title) {
    container.setAttribute("title", opts.title);
  }
  container.contentEditable = "false";
  if (fragment) {
    container.appendChild(serializer.serializeFragment(fragment, { document }));
  }
  return container;
};

/**
 * Build a human-readable hover title from diff attribution.
 */
const hoverTitle = (diff: Diff): string => {
  const parts = [];
  const authorIds = diff.attribution.authorIds;
  if (authorIds.length) {
    parts.push(authorIds.join(", "));
  }
  if (diff.attribution.timestamp) {
    parts.push(new Date(diff.attribution.timestamp).toLocaleString());
  }
  const typeLabel = diff.type.replace("-", " ");
  if (parts.length) {
    return `${typeLabel}: ${parts.join(" — ")}`;
  }
  return typeLabel;
};

/**
 * Build a summary string for a block-update diff showing what changed
 * (e.g. "level: 1 → 2").
 */
const blockUpdateSummary = (diff: Diff): string => {
  if (diff.type !== "block-update") {
    return "";
  }
  const attrs = diff.attributes;
  const prev = diff.previousAttributes;
  if (!attrs) {
    return "";
  }
  const parts = [];
  for (const key of Object.keys(attrs)) {
    const newVal = attrs[key];
    const oldVal = prev?.[key];
    if (oldVal !== undefined && oldVal !== newVal) {
      parts.push(`${key}: ${oldVal} → ${newVal}`);
    } else {
      parts.push(`${key}: ${newVal}`);
    }
  }
  return parts.join(", ");
};

const decorationAttrs = (
  diff: Diff,
  { authorIds, color }: { authorIds: string[]; color?: string },
): DecorationAttrs => {
  const attrs: DecorationAttrs = {
    class: `pm-suggest pm-suggest--${diff.type}`,
    "data-diff-type": diff.type,
  };
  if (authorIds.length) {
    attrs["data-diff-user-id"] = authorIds.join(",");
  }
  if (color) {
    attrs.style = `--author-color: ${color}`;
  }
  // Hover metadata: show author(s), timestamp, and attribute changes
  let title = hoverTitle(diff);
  const summary = blockUpdateSummary(diff);
  if (summary) {
    title += ` (${summary})`;
  }
  attrs.title = title;
  return attrs;
};

/**
 * Find a chain of ancestor node types from `doc` down to a type that can
 * contain `child`. Returns the path of NodeTypes (including doc at index 0)
 * but NOT including the child's own type.
 *
 * Uses BFS from the doc type so the shortest wrapping wins.
 * Returns null if no valid wrapping path exists.
 */
export const findWrappingPath = (
  schema: Schema,
  child: Node,
): NodeType[] | null => {
  const docType = schema.topNodeType;

  // BFS: each entry is a path of node types from doc → ... → parent of child
  type Path = NodeType[];
  const queue: Path[] = [[docType]];
  const visited = new Set<string>([docType.name]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const tip = path[path.length - 1];

    // Check if this node type can contain `child` anywhere in its content expr
    if (tip.contentMatch.matchType(child.type)) {
      return path;
    }

    // Expand: walk the content match automaton edges to find all node types
    // this tip can contain, using the public edgeCount/edge API.
    const match = tip.contentMatch;
    const seenMatches = new Set<any>();
    const matchQueue = [match];
    while (matchQueue.length > 0) {
      const m = matchQueue.shift()!;
      if (seenMatches.has(m)) {
        continue;
      }
      seenMatches.add(m);
      for (let i = 0; i < m.edgeCount; i++) {
        const { type: edgeType, next } = m.edge(i);
        if (!visited.has(edgeType.name)) {
          visited.add(edgeType.name);
          queue.push([...path, edgeType]);
        }
        // Follow the next match state to discover further edges
        matchQueue.push(next);
      }
    }
  }

  return null;
};

/**
 * Wrap a fragment of nodes into a valid doc by finding the schema-required
 * ancestor wrappers for each node.
 */
export const wrapFragmentInDoc = (
  fragment: Fragment,
  schema: Schema,
): Node | null => {
  const firstChild = fragment.firstChild;
  if (!firstChild) {
    return null;
  }

  // Fast path: if doc can directly contain the fragment, just create it
  const directDoc = schema.topNodeType.createAndFill(null, fragment);
  if (directDoc) {
    return directDoc;
  }

  // Find the wrapping path: e.g. [doc, blockGroup, blockContainer]
  const path = findWrappingPath(schema, firstChild);
  if (!path || path.length === 0) {
    return null;
  }

  // The last type in the path directly contains our content nodes.
  // Wrap each fragment child in that innermost type individually.
  const innermostType = path[path.length - 1];
  const wrappedChildren: Node[] = [];
  fragment.forEach((child) => {
    const wrapped = innermostType.createAndFill(null, child);
    if (wrapped) {
      wrappedChildren.push(wrapped);
    }
  });

  if (!wrappedChildren.length) {
    return null;
  }

  // Now wrap all children together through the remaining ancestor types,
  // from second-to-last back to doc (index 0).
  // e.g. [doc, blockGroup, blockContainer]:
  //   wrappedChildren = [blockContainer(child1), blockContainer(child2)]
  //   → blockGroup([blockContainer(child1), blockContainer(child2)])
  //   → doc(blockGroup(...))
  let currentNodes: Node[] | Node = wrappedChildren;
  for (let i = path.length - 2; i >= 0; i--) {
    const wrapped = path[i].createAndFill(null, currentNodes);
    if (!wrapped) {
      return null;
    }
    currentNodes = wrapped;
  }

  const doc = currentNodes as Node;

  return doc;
};


/**
 * Default mapping from a single `Diff` to decoration(s). Returns a `Decoration`,
 * an array of them, or `null` to skip.
 */
export const defaultMapDiffToDecorations =
  (_editor: BlockNoteEditor<any, any, any>) =>
  ({
    diff,
    doc,
    schema,
    index: _index,
    color,
    attributes = {},
  }: MapDiffArgs): Decoration[] | Decoration | null => {
    const authorIds = diff.attribution.authorIds;
    const attrs = {
      ...decorationAttrs(diff, { authorIds, color }),
      ...attributes,
    };
    const spec = { diff };

    switch (diff.type) {
      case "inline-insert":
      case "inline-update":
        return Decoration.inline(diff.from, diff.to, attrs, {
          ...spec,
          inclusiveStart: false,
          inclusiveEnd: true,
        });

      case "block-update":
        return Decoration.node(diff.from, diff.to, attrs, spec);

      case "block-insert": {
        const $from = doc.resolve(diff.from);
        const after = $from.nodeAfter;
        if (after && diff.from + after.nodeSize === diff.to) {
          return Decoration.node(diff.from, diff.to, attrs, spec);
        }

        const decos: Decoration[] = [];
        doc.nodesBetween(diff.from, diff.to, (node, pos) => {
          if (
            pos >= diff.from &&
            pos + node.nodeSize <= diff.to &&
            node.isBlock
          ) {
            decos.push(Decoration.node(pos, pos + node.nodeSize, attrs, spec));
            return false;
          }
          return undefined;
        });
        if (!decos.length) {
          decos.push(Decoration.inline(diff.from, diff.to, attrs, spec));
        }
        return decos;
      }

      case "inline-delete":
      case "block-delete":
        return editableDeletionWidget(diff, schema, {
          color,
          title: hoverTitle(diff),
        });

      default:
        return null;
    }
  };

export const YSuggestionPlugin = createExtension(({ editor }) => {
  return {
    key: "ySuggestion",
    prosemirrorPlugins: [
      ySuggestionDecorationPlugin({
        mapDiffToDecorations: defaultMapDiffToDecorations(editor),
      }),
    ],
    runsBefore: ["default"],
  } as const;
});
