import { useEditorDOMElement } from "./useEditorDomElement.js";
import { useState } from "react";
import { useIsomorphicLayoutEffect } from "../util/useIsomorphicLayoutEffect.js";

/** The editor's layout direction, including an inherited `dir` or CSS direction. */
export function useEditorDirection(): "ltr" | "rtl" {
  const element = useEditorDOMElement();
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  // Read after every commit: React applies dir/style props after rendering.
  // External DOM mutations without a React render are intentionally unobserved.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Direction can change on any commit, without the editor element changing.
  useIsomorphicLayoutEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- Synchronize with the committed DOM before painting, not derived React data.
    setDirection(
      element && getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr",
    );
  });
  return direction;
}
