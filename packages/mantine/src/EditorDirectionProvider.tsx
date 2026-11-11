import {
  useBlockNoteContext,
  useEditorState,
  useIsomorphicLayoutEffect,
} from "@blocknote/react";
import { DirectionProvider, useDirection } from "@mantine/core";
import { type ReactNode, useState } from "react";

type Props = {
  children?: ReactNode | ((direction: "ltr" | "rtl") => ReactNode);
  element?: HTMLElement | null;
};

/** Scope Mantine's official direction API to a UI widget, never the editor. */
export function EditorDirectionProvider({
  children,
  element: fallback,
}: Props) {
  const context = useBlockNoteContext();
  // The existing editor mount snapshot, also valid for standalone/SSR widgets.
  const editorElement = useEditorState({
    editor: context?.editor ?? null,
    selector: ({ editor }) => editor?.domElement,
    equalityFn: (a, b) => a === b,
    on: "mount",
  });
  const element = editorElement ?? fallback;
  const { dir: inherited } = useDirection();
  const [direction, setDirection] = useState(inherited);
  // Sample after each commit, including React dir/style prop updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Direction can change on any commit, without the editor element changing.
  useIsomorphicLayoutEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- Synchronize with the committed DOM before painting, not derived React data.
    setDirection(
      element
        ? getComputedStyle(element).direction === "rtl"
          ? "rtl"
          : "ltr"
        : inherited,
    );
  });
  const content =
    typeof children === "function" ? children(direction) : children;
  if (direction === inherited) {
    return content;
  }
  // Mantine only accepts an initial direction; its setter mutates <html dir>.
  // Recreate this widget's provider if direction changes, not BlockNoteView or
  // its editable DOM. No global mutation or document-wide observers are needed.
  return (
    <DirectionProvider
      key={direction}
      initialDirection={direction}
      detectDirection={false}
    >
      {content}
    </DirectionProvider>
  );
}
