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
  const fragment =
    "node" in view.state.selection &&
    (view.state.selection.node as Node).type.spec.group === "blockContent"
      ? new NodeSelection(
          view.state.doc.resolve(view.state.selection.from - 1)
        ).content().content
      : view.state.selection.content().content;

  (async () => {
    const internalHTMLSerializer = createInternalHTMLSerializer(
      view.state.schema,
      editor
    );
    const internalHTML = internalHTMLSerializer.serializeProseMirrorFragment(
      fragment,
      {}
    );

    await initializeESMDependencies();
    const externalHTMLExporter = createExternalHTMLExporter(
      view.state.schema,
      editor
    );
    const externalHTML = externalHTMLExporter.exportProseMirrorFragment(
      fragment,
      {}
    );

    const plainText = cleanHTMLToMarkdown(externalHTML);

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
            },
          },
        }),
      ];
    },
  });
