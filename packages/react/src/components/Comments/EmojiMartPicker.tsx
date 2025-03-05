// From https://github.com/missive/emoji-mart/blob/main/packages/emoji-mart-react/react.tsx
import React, { useEffect, useRef } from "react";
import { Picker } from "emoji-mart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EmojiPicker(props: any) {
  const ref = useRef(null);
  const instance = useRef(null) as any;

  if (instance.current) {
    instance.current.update(props);
  }

  useEffect(() => {
    instance.current = new Picker({ ...props, ref });

    return () => {
      instance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return React.createElement("div", { ref });
}
