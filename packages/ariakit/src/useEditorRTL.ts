import {
  useBlockNoteContext,
  useEditorState,
  useIsomorphicLayoutEffect,
} from "@blocknote/react";
import { useState } from "react";

/** Ariakit configures direction on each composite store, not a global provider. */
export function useEditorRTL(fallback?: HTMLElement | null) {
  const context = useBlockNoteContext();
  const element = useEditorState({
    editor: context?.editor ?? null,
    selector: ({ editor }) => editor?.domElement,
    equalityFn: (a, b) => a === b,
    on: "mount",
  });
  const target = element ?? fallback;
  const [rtl, setRTL] = useState<boolean | undefined>();
  // Leave native provider/store defaults in charge outside a mounted editor.
  // Sample after each commit, including React dir/style prop updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Direction can change on any commit, without the editor element changing.
  useIsomorphicLayoutEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- Synchronize with the committed DOM before painting, not derived React data.
    setRTL(target ? getComputedStyle(target).direction === "rtl" : undefined);
  });
  return rtl;
}
