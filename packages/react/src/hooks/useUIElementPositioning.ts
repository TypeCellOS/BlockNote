import {
  useDismiss,
  useFloating,
  UseFloatingOptions,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

export function useUIElementPositioning(
  show: boolean,
  referencePos: DOMRect | null,
  zIndex: number,
  options?: Partial<UseFloatingOptions>
) {
  /*const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    ...options,
  });*/
  //const [transform, setTransform] = useState("none");
  const ref = useRef<HTMLDivElement | null>(null);
  const viewportHandlerRef = useRef<() => void>(() => {});
  //const { isMounted, styles } = useTransitionStyles(context);

  // handle "escape" and other dismiss events, these will add some listeners to
  // getFloatingProps which need to be attached to the floating element
  //const dismiss = useDismiss(context);

  //const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  /*useEffect(() => {
    update();
  }, [referencePos, update]);*/

  /*useEffect(() => {
    // Will be null on initial render when used in UI component controllers.
    if (referencePos === null) {
      return;
    }

    refs.setReference({
      getBoundingClientRect: () => referencePos,
    });
  }, [referencePos, refs]);*/
  useEffect(() => {
    const viewport = window.visualViewport!;

    function viewportHandler() {
      const layoutViewport = document.body;

      // Since the bar is position: fixed we need to offset it by the visual
      // viewport's offset from the layout viewport origin.
      const offsetLeft = viewport.offsetLeft;
      const offsetTop =
        viewport.height -
        layoutViewport.getBoundingClientRect().height +
        viewport.offsetTop;

      // You could also do this by setting style.left and style.top if you
      // use width: 100% instead.
      if (ref.current) {
        ref.current.style.transform = `translate(${offsetLeft}px, ${offsetTop}px) scale(${
          1 / viewport.scale
        })`;
      }
    }
    window.visualViewport!.addEventListener("scroll", viewportHandler);
    window.visualViewport!.addEventListener("resize", viewportHandler);
    viewportHandler();
    viewportHandlerRef.current = viewportHandler;
  }, []);

  return useMemo(() => {
    return {
      isMounted: true,
      ref: (el) => {
        ref.current = el;
        viewportHandlerRef.current!();
      },
      style: {
        display: "flex",
        /*...styles,
        ...floatingStyles,*/
        position: "absolute",
        transition: "transform 0.1s",

        //transform: transform,
        maxWidth: "100vw",
        overflowX: "auto",
        bottom: 0,
        top: "unset",
        zIndex: zIndex,
        opacity: 1,
      },
      getFloatingProps: () => ({}),
      getReferenceProps: () => ({}),
    };
  }, [
    /*floatingStyles,
    isMounted,
    refs.setFloating,
    styles,*/
    zIndex,
    /*getFloatingProps,
    getReferenceProps,*/
    //transform,
  ]);
}
