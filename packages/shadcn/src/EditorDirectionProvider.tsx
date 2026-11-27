import {
  DirectionProvider,
  useDirection,
} from "@base-ui/react/direction-provider";
import {
  useBlockNoteContext,
  useEditorState,
  useIsomorphicLayoutEffect,
} from "@blocknote/react";
import { type ReactNode, useState } from "react";

type Props = { children?: ReactNode; element?: HTMLElement | null };

/** Base UI needs its direction context in addition to the editor's DOM dir. */
export function EditorDirectionProvider({
  children,
  element: fallback,
}: Props) {
  const context = useBlockNoteContext();
  const editorElement = useEditorState({
    editor: context?.editor ?? null,
    selector: ({ editor }) => editor?.domElement,
    equalityFn: (a, b) => a === b,
    on: "mount",
  });
  const element = editorElement ?? fallback;
  const inherited = useDirection();
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
  return (
    <DirectionProvider direction={direction}>{children}</DirectionProvider>
  );
}
