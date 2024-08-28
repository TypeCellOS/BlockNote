import { Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { NodeSelection, Plugin } from "prosemirror-state";

import { EditorView } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { initializeESMDependencies } from "../../util/esmDependencies";
import { createExternalHTMLExporter } from "./html/externalHTMLExporter";
import { createInternalHTMLSerializer } from "./html/internalHTMLSerializer";
import { cleanHTMLToMarkdown } from "./markdown/markdownExporter";

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
  const selectedFragment = view.state.selection.content().content;

  const internalHTMLSerializer = await createInternalHTMLSerializer(
    view.state.schema,
    editor
  );
  const internalHTML = internalHTMLSerializer.serializeProseMirrorFragment(
    selectedFragment,
    {}
  );

  await initializeESMDependencies();
  const externalHTMLExporter = createExternalHTMLExporter(
    view.state.schema,
    editor
  );
  const externalHTML = externalHTMLExporter.exportProseMirrorFragment(
    selectedFragment,
    {}
  );

  const plainText = await cleanHTMLToMarkdown(externalHTML);

  return { internalHTML, externalHTML, plainText };
}

export const createCopyToClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "copyToClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              copy(view, event) {
                // Stops the default browser copy behaviour.
                event.preventDefault();
                event.clipboardData!.clearData();

                // Checks if a `blockContent` node is being copied and expands
                // the selection to the parent `blockContainer` node. This is
                // for the use-case in which only a block without content is
                // selected, e.g. an image block.
                if (
                  "node" in view.state.selection &&
                  (view.state.selection.node as Node).type.spec.group ===
                    "blockContent"
                ) {
                  editor.dispatch(
                    editor._tiptapEditor.state.tr.setSelection(
                      new NodeSelection(
                        view.state.doc.resolve(view.state.selection.from - 1)
                      )
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
