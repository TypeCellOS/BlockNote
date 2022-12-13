import { Editor } from "@tiptap/core";
import { createRoot } from "react-dom/client";
import { HyperlinkMenu } from "./components/HyperlinkMenu";
import tippy from "tippy.js";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../BlockNoteTheme";

export const HyperlinkMenuFactory = (
  editor: Editor,
  url: string,
  text: string,
  update: (url: string, text: string) => void,
  remove: () => void
) => {
  const element = document.createElement("div");
  const root = createRoot(element);

  const getReferenceClientRect = () => {
    const { left, top } = editor.view.coordsAtPos(
      editor.state.selection.anchor
    );

    return new DOMRect(left, top);
  };

  root.render(
    <MantineProvider theme={BlockNoteTheme}>
      <HyperlinkMenu
        url={url}
        text={text}
        pos={getReferenceClientRect()}
        update={update}
        remove={remove}
      />
    </MantineProvider>
  );

  const menu = tippy(document.body, {
    duration: 0,
    getReferenceClientRect: getReferenceClientRect,
    content: element,
    interactive: true,
    trigger: "manual",
    placement: "top",
    hideOnClick: "toggle",
  });

  menu.show();

  return element as HTMLElement;
};
