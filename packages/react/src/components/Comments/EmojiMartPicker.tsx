// From https://github.com/missive/emoji-mart/blob/main/packages/emoji-mart-react/react.tsx
import type { EmojiMartData } from "@emoji-mart/data";
import React, { useEffect, useRef } from "react";

// Temporary fix for https://github.com/missive/emoji-mart/pull/929
let emojiMart: typeof import("emoji-mart") | undefined;
let emojiData: EmojiMartData | undefined;

async function loadEmojiMart() {
  if (!emojiMart || !emojiData) {
    // load dynamically because emoji-mart doesn't specify type: module and breaks in nodejs
    const [emojiMartModule, emojiDataModule] = await Promise.all([
      import("emoji-mart"),
      // use a dynamic import to encourage bundle-splitting
      // and a smaller initial client bundle size
      import("@emoji-mart/data"),
    ]);

    emojiMart =
      "default" in emojiMartModule ? emojiMartModule.default : emojiMartModule;
    emojiData =
      "default" in emojiDataModule
        ? (emojiDataModule.default as EmojiMartData)
        : (emojiDataModule as EmojiMartData);

    emojiMart.init({ data: emojiData });
  }

  return { emojiMart, emojiData };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EmojiPicker(props: any) {
  const ref = useRef(null);
  const instance = useRef(null) as any;

  if (instance.current) {
    instance.current.update(props);
  }

  useEffect(() => {
    (async () => {
      const { emojiMart } = await loadEmojiMart();

      instance.current = new emojiMart.Picker({ ...props, ref });
    })();

    return () => {
      instance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return React.createElement("div", { ref });
}
