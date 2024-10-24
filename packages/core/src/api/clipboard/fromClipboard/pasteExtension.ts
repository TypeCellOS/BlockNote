import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import {
  DOMParser,
  ParseRule,
  Schema,
  StyleParseRule,
} from "prosemirror-model";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nestedListsToBlockNoteStructure } from "../../parsers/html/util/nestedLists.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";
import { handleFileInsertion } from "./handleFileInsertion.js";

debugger;
function createParser(editor: BlockNoteEditor<any, any, any>, schema: Schema) {
  let result: ParseRule[] = [];
  function insert(rule: ParseRule) {
    let priority = rule.priority == null ? 50 : rule.priority,
      i = 0;
    for (; i < result.length; i++) {
      let next = result[i],
        nextPriority = next.priority == null ? 50 : next.priority;
      if (nextPriority < priority) break;
    }
    result.splice(i, 0, rule);
  }

  for (let name in schema.marks) {
    let rules = schema.marks[name].spec.parseDOM;
    if (rules)
      rules.forEach((rule) => {
        insert((rule = rule as ParseRule));
        if (!(rule.mark || rule.ignore || (rule as StyleParseRule).clearMark))
          rule.mark = name;
      });
  }

  for (let name in schema.nodes) {
    if (name === "tableParagraph") {
      let rules = schema.nodes[name].spec.parseDOM;
      if (rules)
        rules.forEach((rule) => {
          insert((rule = copy(rule) as TagParseRule));
          if (!((rule as TagParseRule).node || rule.ignore || rule.mark))
            rule.node = name;
        });
    }
  }
  debugger;
  const parser = new DOMParser(editor._tiptapEditor.schema, result);

  // const oldParseSlice = parser.parseSlice;
  // parser.parseSlice = (dom, options) => {
  //   if (options)
  //   return oldParseSlice.call(parser, dom, options);
  // };
  return parser;
}

export const createPasteFromClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "pasteFromClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            clipboardParser: createParser(editor, editor._tiptapEditor.schema),
            handleDOMEvents: {
              paste(_view, event) {
                event.preventDefault();

                if (!editor.isEditable) {
                  return;
                }

                let format: (typeof acceptedMIMETypes)[number] | undefined;
                for (const mimeType of acceptedMIMETypes) {
                  if (event.clipboardData!.types.includes(mimeType)) {
                    format = mimeType;
                    break;
                  }
                }
                if (!format) {
                  return true;
                }

                if (format === "Files") {
                  handleFileInsertion(event, editor);
                  return true;
                }

                let data = event.clipboardData!.getData(format);

                if (format === "blocknote/html") {
                  editor._tiptapEditor.view.pasteHTML(data);
                  return true;
                }

                if (format === "text/html") {
                  const htmlNode = nestedListsToBlockNoteStructure(data.trim());
                  data = htmlNode.innerHTML;
                  editor._tiptapEditor.view.pasteHTML(
                    "<div>" + data + "</div>"
                  );
                  return true;
                }

                editor._tiptapEditor.view.pasteText(data);

                return true;
              },
            },
          },
        }),
      ];
    },
  });
