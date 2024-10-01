import { Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { NodeSelection, Plugin } from "prosemirror-state";

import { EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { initializeESMDependencies } from "../../util/esmDependencies";
import { createExternalHTMLExporter } from "./html/externalHTMLExporter";
import { cleanHTMLToMarkdown } from "./markdown/markdownExporter";

// use a dynamic import because we want to access
// __serializeForClipboard which is not exposed in types
let pmView: any;

async function selectedFragmentToHTML<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  view: EditorView,
  editor: BlockNoteEditor<BSchema, I, S>
): Promise<{
  internalHTML: string;
  externalHTML: string;
  plainText: string;
}> {
  // Uses default ProseMirror clipboard serialization.
  const internalHTML: string = pmView.__serializeForClipboard(
    view,
    view.state.selection.content()
  ).dom.innerHTML;

  // Checks whether block ancestry should be included when creating external
  // HTML. If the selection is within a block content node, the block ancestry
  // is excluded as we only care about the inline content.
  let selectedFragment = view.state.doc.slice(
    view.state.selection.from,
    view.state.selection.to,
    false
  ).content;

  const children = [];
  for (let i = 0; i < selectedFragment.childCount; i++) {
    children.push(selectedFragment.child(i));
  }

  const isWithinBlockContent =
    children.find(
      (child) =>
        child.type.name === "blockContainer" ||
        child.type.name === "blockGroup" ||
        child.type.spec.group === "blockContent"
    ) === undefined;
  if (!isWithinBlockContent) {
    selectedFragment = view.state.doc.slice(
      view.state.selection.from,
      view.state.selection.to,
      true
    ).content;
  }

  await initializeESMDependencies();
  const externalHTMLExporter = createExternalHTMLExporter(
    view.state.schema,
    editor
  );
  const externalHTML = externalHTMLExporter.exportProseMirrorFragment(
    selectedFragment,
    { simplifyBlocks: !isWithinBlockContent }
  );

  const plainText = cleanHTMLToMarkdown(externalHTML);

  return { internalHTML, externalHTML, plainText };
}

const copyToClipboard = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  view: EditorView,
  event: ClipboardEvent
) => {
  // Stops the default browser copy behaviour.
  event.preventDefault();
  event.clipboardData!.clearData();

  // Checks if a `blockContent` node is being copied and expands
  // the selection to the parent `blockContainer` node. This is
  // for the use-case in which only a block without content is
  // selected, e.g. an image block.
  if (
    "node" in view.state.selection &&
    (view.state.selection.node as Node).type.spec.group === "blockContent"
  ) {
    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        new NodeSelection(view.state.doc.resolve(view.state.selection.from - 1))
      )
    );
  }

  (async () => {
    const { internalHTML, externalHTML, plainText } =
      await selectedFragmentToHTML(view, editor);

    // TODO: Writing to other MIME types not working in Safari for
    //  some reason.
    event.clipboardData!.setData("blocknote/html", internalHTML);
    event.clipboardData!.setData("text/html", externalHTML);
    event.clipboardData!.setData("text/plain", plainText);
  })();
};

export const createCopyToClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "copyToClipboard",
    onCreate: async () => {
      pmView = await import("prosemirror-view");
    },
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              copy(view, event) {
                copyToClipboard(editor, view, event);
                // Prevent default PM handler to be called
                return true;
              },
              cut(view, event) {
                copyToClipboard(editor, view, event);
                view.dispatch(view.state.tr.deleteSelection());
                // Prevent default PM handler to be called
                return true;
              },
              // This is for the use-case in which only a block without content
              // is selected, e.g. an image block, and dragged (not using the
              // drag handle).
              dragstart(view, event) {
                // Checks if a `NodeSelection` is active.
                if (!("node" in view.state.selection)) {
                  return;
                }

                // Checks if a `blockContent` node is being dragged.
                if (
                  (view.state.selection.node as Node).type.spec.group !==
                  "blockContent"
                ) {
                  return;
                }

                // Expands the selection to the parent `blockContainer` node.
                editor.dispatch(
                  editor._tiptapEditor.state.tr.setSelection(
                    new NodeSelection(
                      view.state.doc.resolve(view.state.selection.from - 1)
                    )
                  )
                );

                // Stops the default browser drag start behaviour.
                event.preventDefault();
                event.dataTransfer!.clearData();

                (async () => {
                  const { internalHTML, externalHTML, plainText } =
                    await selectedFragmentToHTML(view, editor);

                  // TODO: Writing to other MIME types not working in Safari for
                  //  some reason.
                  event.dataTransfer!.setData("blocknote/html", internalHTML);
                  event.dataTransfer!.setData("text/html", externalHTML);
                  event.dataTransfer!.setData("text/plain", plainText);
                })();
                // Prevent default PM handler to be called
                return true;
              },
            },
          },
        }),
      ];
    },
  });
