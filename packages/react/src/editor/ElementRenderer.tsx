import { forwardRef, useImperativeHandle, useState } from "react";
import { createPortal, flushSync } from "react-dom";

export const ElementRenderer = forwardRef<
  (node: React.ReactNode, container: HTMLElement) => void
>((_props, ref) => {
  const [singleRenderData, setSingleRenderData] = useState<any>();

  useImperativeHandle(
    ref,
    () => {
      return (node: React.ReactNode, container: HTMLElement) => {
        flushSync(() => {
          setSingleRenderData({ node, container });
        });

        // clear after it's been rendered to `container`
        setSingleRenderData(undefined);
      };
    },
    []
  );

  return (
    <>
      {singleRenderData &&
        createPortal(singleRenderData.node, singleRenderData.container)}
    </>
  );
});
