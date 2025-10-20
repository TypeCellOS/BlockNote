import { Extension } from "@tiptap/core";

export const ArrowConversionExtension = Extension.create({
  name: "arrowConversion",

  addInputRules() {
    return [
      {
        undoable: true,
        find: /->/g,
        handler: ({ state, range, chain }) => {
          const { from, to } = range;
          const tr = state.tr.replaceWith(from, to, state.schema.text("→"));
          chain().insertContent(tr).run();
        },
        undoable: true,
      },
    ];
  },
});
