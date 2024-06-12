import { ForwardedRef, MutableRefObject } from "react";

export function mergeRefs<ElementType extends HTMLElement>(
  ...refs: (MutableRefObject<ElementType> | ForwardedRef<ElementType>)[]
) {
  return (node: ElementType | null) => {
    for (const ref of refs) {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    }
  };
}
