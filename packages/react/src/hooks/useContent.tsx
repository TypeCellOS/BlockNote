import { useReactNodeView } from "@tiptap/react";

export function useContent() {
  return {
    ref: useReactNodeView().nodeViewContentRef,
    style: { whiteSpace: "pre-wrap" },
    "data-node-view-content": "",
  };
}
