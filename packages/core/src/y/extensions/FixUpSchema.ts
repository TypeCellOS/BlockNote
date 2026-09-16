import { Attrs, Fragment, Mark, Node } from "prosemirror-model";

import { createExtension } from "../../editor/BlockNoteExtension.js";

// Collaboration-only patch to the live ProseMirror schema, applied once on
// `create`, before the binding binds and reconstructs the document.
//
// Preserve the initial block id.
// When the binding creates an empty document, the `blockContainer` node is
// created with an `id` of `null`. This causes the unique id extension to
// generate a new id for the initial block, which is not what we want since it
// will be randomly generated & cause there to be more updates to the doc.
// This is a hack to make it so that anytime `schema.doc.createAndFill` is
// called, the initial block id is already set to "initialBlockId".
//
// This is the `y/`-stack counterpart of the `createAndFill` override in
// `yjs/extensions/FixUpSchema.ts` (which additionally filters disallowed
// marks for plain-content blocks — a legacy-schema migration concern that
// does not apply here). The stamp matters twice: the UniqueID rescue for
// bind-time nulled ids compares against `createAndFill()`, and
// @y/prosemirror's initial-content gate only engages when the editor's
// document fingerprint equals the schema default. Without the stamp, every
// fresh client mints its own id for the initial paragraph and writes it into
// an empty fragment — the init race that surfaces as duplicated "phantom"
// blocks with flip-flopping order after a merge.
// covers both empty-doc call shapes: no content arg (fill the default) and an
// explicitly empty fragment. @y/prosemirror v2 renders received deltas via
// `doc.createAndFill(attrs, content, marks)` WITH content (`deltaToPNode`) —
// that path must pass through untouched, otherwise every render of foreign
// content comes back as the cached empty skeleton (tombstoning the real
// content and resurrecting the phantom paragraph on merge).
function hasContent(
  content: Fragment | Node | readonly Node[] | undefined,
): boolean {
  return content != null && Fragment.from(content).size > 0;
}

export const FixUpSchemaExtension = createExtension(({ editor }) => {
  editor.on("create", () => {
    const schema = editor.pmSchema;

    let cache: Node | undefined = undefined;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentionally saving reference for monkey-patching
    const oldCreateAndFill = schema.nodes.doc.createAndFill;
    schema.nodes.doc.createAndFill = ((
      attrs?: Attrs | null,
      content?: Fragment | Node | readonly Node[],
      marks?: readonly Mark[],
    ) => {
      if (hasContent(content)) {
        return oldCreateAndFill.call(schema.nodes.doc, attrs, content, marks);
      }
      if (cache) {
        return cache;
      }
      const ret = oldCreateAndFill.call(
        schema.nodes.doc,
        attrs,
        content,
        marks,
      )!;

      // create a copy that we can mutate (otherwise, assigning attrs is not safe and corrupts the pm state)
      const jsonNode = JSON.parse(JSON.stringify(ret.toJSON()));
      jsonNode.content[0].content[0].attrs.id = "initialBlockId";

      cache = Node.fromJSON(schema, jsonNode);
      return cache;
    }) as unknown as typeof schema.nodes.doc.createAndFill;
  });

  return {
    key: "fixUpSchema",
  } as const;
});
