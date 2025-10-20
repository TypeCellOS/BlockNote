import {
  BlockNoteEditor,
  createStore,
  Extension,
  ExtensionFactory,
} from "@blocknote/core";
import { useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import { useBlockNoteEditor } from "./useBlockNoteEditor.js";

type Store<T> = ReturnType<typeof createStore<T>>;

/**
 * Use an extension instance
 */
export function usePlugin(
  plugin: ExtensionFactory | Extension,
  ctx?: { editor?: BlockNoteEditor },
) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const editor = ctx?.editor ?? useBlockNoteEditor();

  const instance = useMemo(() => editor.addExtension(plugin), [editor, plugin]);

  return instance;
}

type ExtractStore<T> = T extends Store<infer U> ? U : never;

/**
 * Use the state of an extension
 */
export function usePluginState<
  T extends ExtensionFactory | Extension,
  TExtension = T extends ExtensionFactory ? ReturnType<T> : T,
  TStore = TExtension extends { store: Store<any> }
    ? TExtension["store"]
    : never,
  TSelected = NoInfer<ExtractStore<TStore>>,
>(
  plugin: T,
  ctx?: {
    editor?: BlockNoteEditor;
    selector?: (state: NoInfer<ExtractStore<TStore>>) => TSelected;
  },
): TSelected {
  const { store } = usePlugin(plugin, ctx);
  if (!store) {
    throw new Error("Store not found", { cause: { plugin } });
  }
  return useStore<ExtractStore<TStore>, TSelected>(store, ctx?.selector as any);
}
