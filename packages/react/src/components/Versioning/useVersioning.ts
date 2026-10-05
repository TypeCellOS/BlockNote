import type { VersioningController } from "@blocknote/core/extensions";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useStore } from "../../hooks/useStore.js";

export function useVersioning() {
  const editor = useBlockNoteEditor();
  const versioning = editor.getExtension<VersioningController>("versioning");
  if (!versioning) {
    throw new Error("VersioningSidebar requires VersioningExtension");
  }
  return versioning;
}

export function useVersioningState() {
  return useStore(useVersioning().store);
}
