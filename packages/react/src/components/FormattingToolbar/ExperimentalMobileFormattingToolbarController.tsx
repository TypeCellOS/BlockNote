import {
  BlockSchema,
  FormattingToolbarExtension,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, CSSProperties, useMemo, useRef, useState, useEffect } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { usePluginState } from "../../hooks/usePlugin.js";
import { FormattingToolbar } from "./FormattingToolbar.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";

/**
 * Experimental formatting toolbar controller for mobile devices.
 * Uses Visual Viewport API to position the toolbar above the virtual keyboard.
 *
 * Currently marked experimental due to the flickering issue with positioning cause by the use of the API (and likely a delay in its updates).
 */
export const ExperimentalMobileFormattingToolbarController = (props: {
  formattingToolbar?: FC<FormattingToolbarProps>;
}) => {
  const [transform, setTransform] = useState<string>("none");
  const divRef = useRef<HTMLDivElement>(null);
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const show = usePluginState(FormattingToolbarExtension, {
    editor,
    selector: (state) => state.show,
  });

  const style = useMemo<CSSProperties>(() => {
    return {
      display: "flex",
      position: "fixed",
      bottom: 0,
      zIndex: 3000,
      transform,
    };
  }, [transform]);

  useEffect(() => {
    const viewport = window.visualViewport!;
    function viewportHandler() {
      // Calculate the offset necessary to set the toolbar above the virtual keyboard (using the offset info from the visualViewport)
      const layoutViewport = document.body;
      const offsetLeft = viewport.offsetLeft;
      const offsetTop =
        viewport.height -
        layoutViewport.getBoundingClientRect().height +
        viewport.offsetTop;

      setTransform(
        `translate(${offsetLeft}px, ${offsetTop}px) scale(${
          1 / viewport.scale
        })`,
      );
    }
    window.visualViewport!.addEventListener("scroll", viewportHandler);
    window.visualViewport!.addEventListener("resize", viewportHandler);
    viewportHandler();

    return () => {
      window.visualViewport!.removeEventListener("scroll", viewportHandler);
      window.visualViewport!.removeEventListener("resize", viewportHandler);
    };
  }, []);

  if (!show && divRef.current) {
    // The component is fading out. Use the previous state to render the toolbar with innerHTML,
    // because otherwise the toolbar will quickly flickr (i.e.: show a different state) while fading out,
    // which looks weird
    return (
      <div
        ref={divRef}
        style={style}
        dangerouslySetInnerHTML={{ __html: divRef.current.innerHTML }}
      ></div>
    );
  }

  const Component = props.formattingToolbar || FormattingToolbar;

  return (
    <div ref={divRef} style={style}>
      <Component />
    </div>
  );
};
