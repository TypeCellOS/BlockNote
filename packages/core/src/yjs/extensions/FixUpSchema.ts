import { Attrs, Fragment, Mark, Node, NodeType } from "prosemirror-model";

import { isPlainContentNodeType } from "../../api/pmUtil.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";

// Collaboration-only patches to the live ProseMirror schema. Both are applied
// once on `create`, before y-prosemirror binds and reconstructs the document.
export const FixUpSchemaExtension = createExtension(({ editor }) => {
  editor.on("create", () => {
    const schema = editor.pmSchema;

    // 1. Preserve the initial block id.
    // When y-prosemirror creates an empty document, the `blockContainer` node is created with an `id` of `null`.
    // This causes the unique id extension to generate a new id for the initial block, which is not what we want
    // Since it will be randomly generated & cause there to be more updates to the ydoc
    // This is a hack to make it so that anytime `schema.doc.createAndFill` is called, the initial block id is already set to "initialBlockId"
    let cache: Node | undefined = undefined;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally saving reference for monkey-patching
    const oldCreateAndFill = schema.nodes.doc.createAndFill;
    schema.nodes.doc.createAndFill = ((...args: any) => {
      if (cache) {
        return cache;
      }
      const ret = oldCreateAndFill.apply(schema.nodes.doc, args)!;

      // create a copy that we can mutate (otherwise, assigning attrs is not safe and corrupts the pm state)
      const jsonNode = JSON.parse(JSON.stringify(ret.toJSON()));
      jsonNode.content[0].content[0].attrs.id = "initialBlockId";

      cache = Node.fromJSON(schema, jsonNode);
      return cache;
    }) as unknown as typeof schema.nodes.doc.createAndFill;

    // 2. Drop marks a plain block no longer allows, instead of deleting the block.
    // When a block's content type changes across BlockNote versions — e.g. a
    // `codeBlock` that was `"inline"` (formatting marks like bold allowed) and is
    // now `"plain"` (only the `"annotation"` mark group: comments + suggestions) —
    // old Yjs documents carry text with marks the new node type disallows.
    //
    // y-prosemirror rebuilds each block by calling `schema.node(nodeName, attrs,
    // children)`, where `children` are text nodes that may still carry those
    // disallowed marks. `createChecked` then throws, and y-prosemirror's error
    // handler DELETES the whole block from the Yjs doc — a deletion that propagates
    // to every peer (data loss).
    //
    // Rather than mutating the Yjs doc to strip those marks, we leave them in place
    // (marks are just format attributes; they don't affect position counting, so
    // editing text is unaffected) and simply never materialize the disallowed ones
    // into ProseMirror. We do that by wrapping `schema.node` to filter each text
    // child's marks through the parent node type's `allowedMarks` before the node
    // is built. The wrapper is scoped to plain-content blocks (the only place this
    // migration applies); all other node types pass through untouched.
    //
    // NOTE: this covers marks that EXIST in the schema but aren't allowed on the
    // node. A mark whose type is entirely absent from the schema still hits
    // y-prosemirror's earlier `schema.mark` throw (and delete) path — that's a
    // different migration scenario and is out of scope here.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally saving reference for monkey-patching
    const originalNode = schema.node;
    schema.node = function (
      this: typeof schema,
      type: string | NodeType,
      attrs?: Attrs | null,
      content?: Fragment | Node | readonly Node[],
      marks?: readonly Mark[],
    ) {
      const nodeType = typeof type === "string" ? this.nodes[type] : type;
      // y-prosemirror always passes `content` as a plain array of nodes; only
      // touch text children that carry marks.
      if (
        nodeType &&
        isPlainContentNodeType(this, nodeType) &&
        Array.isArray(content)
      ) {
        content = (content as readonly Node[]).map((child) =>
          child?.isText && child.marks.length
            ? child.mark(nodeType.allowedMarks(child.marks))
            : child,
        );
      }
      return originalNode.call(this, type, attrs, content, marks);
    } as typeof schema.node;
  });

  return {
    key: "fixUpSchema",
  } as const;
});
