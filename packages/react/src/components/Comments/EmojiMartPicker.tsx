// From https://github.com/missive/emoji-mart/blob/main/packages/emoji-mart-react/react.tsx
import React, { useEffect, useRef } from "react";

// Temporary fix for https://github.com/missive/emoji-mart/pull/929
let emojiMart: typeof import("emoji-mart") | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EmojiPicker(props: any) {
  const ref = useRef(null);
  const instance = useRef(null) as any;

  if (instance.current) {
    instance.current.update(props);
  }

  useEffect(() => {
    (async () => {
      if (!emojiMart) {
        // load dynamically because emoji-mart doesn't specify type: module and breaks in nodejs
        emojiMart = await import("emoji-mart");
      }

      instance.current = new emojiMart.Picker({ ...props, ref });
    })();

    return () => {
      instance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return React.createElement("div", { ref });
}
