import { Editor, isNodeSelection, posToDOMRect } from "@tiptap/core";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../../../core/src/BlockNoteTheme";
import { BubbleMenu } from "./components/BubbleMenu";
import tippy from "tippy.js";
// import rootStyles from "../../../core/src/root.module.css";

export const BubbleMenuFactory = (editor: Editor) => {
  const element = document.createElement("div");
  // element.className = rootStyles.bnRoot;
  const root = createRoot(element);
  root.render(
    <MantineProvider theme={BlockNoteTheme}>
      <BubbleMenu editor={editor} />
    </MantineProvider>
  );

  const { state } = editor.view;
  const { selection } = state;

  // support for CellSelections
  const { ranges } = selection;
  const from = Math.min(...ranges.map((range) => range.$from.pos));
  const to = Math.max(...ranges.map((range) => range.$to.pos));

  const getReferenceRect = () => {
    if (isNodeSelection(state.selection)) {
      const node = editor.view.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(editor.view, from, to);
  };

  const menu = tippy(document.body, {
    duration: 0,
    getReferenceClientRect: getReferenceRect,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  menu.show();

  return element as HTMLElement;
};
