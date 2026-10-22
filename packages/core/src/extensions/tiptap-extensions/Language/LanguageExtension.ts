import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// The `lang` prop renders out to a `data-lang` HTML attributes like all other props. To be useful
// for assistive technologies though, a `lang` attribute has to be rendered. This extension applies
// the `lang` attribute wherever `data-lang` appears.
export const LanguageExtension = Extension.create({
  name: "blockLanguage",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: ({ doc }) => {
            const decorations: Decoration[] = [];
            doc.descendants((node, pos) => {
              if (typeof node.attrs.lang === "string") {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    lang: node.attrs.lang,
                  }),
                );
              }
            });
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
