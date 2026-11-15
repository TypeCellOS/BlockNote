import { useCallback, useRef, useState } from "react";
import { parseSourceUrl } from "./url.js";

export type SafeIframeProps = {
  src: string;
  title: string;
  aspectRatio?: number;
  allow?: string;
  referrerPolicy?: "no-referrer" | "strict-origin-when-cross-origin";
  /** Provider-specific message format. Origin and window are checked before decoding. */
  decodeHeight?: (data: unknown) => number | undefined;
};

/** Fresh iframe only: no upstream HTML, srcDoc, arbitrary attributes or wildcard messaging. */
export function SafeIframe({
  src,
  title,
  aspectRatio = 16 / 9,
  allow,
  referrerPolicy = "no-referrer",
  decodeHeight,
}: SafeIframeProps) {
  const attachment = useRef<AbortController | undefined>(undefined);
  const [height, setHeight] = useState<number>();
  const url = parseSourceUrl(src);
  const origin = url?.origin;
  const attach = useCallback(
    (node: HTMLIFrameElement | null): void => {
      attachment.current?.abort();
      attachment.current = undefined;
      if (!node || !origin || !decodeHeight) {
        return;
      }
      const controller = new AbortController();
      attachment.current = controller;
      node.ownerDocument.defaultView?.addEventListener(
        "message",
        (event: MessageEvent<unknown>) => {
          if (
            event.origin !== origin ||
            !node.contentWindow ||
            event.source !== node.contentWindow
          ) {
            return;
          }
          const value = decodeHeight(event.data);
          if (
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
          ) {
            setHeight(Math.min(2000, Math.max(100, value)));
          }
        },
        { signal: controller.signal },
      );
    },
    [origin, decodeHeight],
  );
  if (
    !url ||
    url.protocol !== "https:" ||
    (typeof window !== "undefined" && url.origin === window.location.origin)
  ) {
    return null;
  }
  return (
    <iframe
      ref={attach}
      src={src}
      title={title}
      className="bn-embed-iframe"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      referrerPolicy={referrerPolicy}
      allow={allow}
      allowFullScreen
      loading="lazy"
      style={height ? { height } : { aspectRatio }}
    />
  );
}
