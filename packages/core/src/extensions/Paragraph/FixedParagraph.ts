import Paragraph from "@tiptap/extension-paragraph";

// Override paragraph to disable "Mod-Alt-0" shortcut throw invalid content for doc type error
export const FixedParagraph = Paragraph.extend({
  addKeyboardShortcuts: () => {
    return {
      "Mod-Alt-0": () => {
        return false;
      },
    };
  },
});
