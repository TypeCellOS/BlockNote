// From https://github.com/missive/emoji-mart/blob/main/packages/emoji-mart-react/react.tsx
import type { EmojiMartData } from "@blocknote/emoji-data";
import React, { useEffect, useRef } from "react";

// Temporary fix for https://github.com/missive/emoji-mart/pull/929
let currentLocale: string | undefined;
let emojiLoadingPromise:
  | Promise<{
      emojiMart: typeof import("emoji-mart");
      emojiData: EmojiMartData;
    }>
  | undefined;

async function loadEmojiMart(locale?: string) {
  const targetLocale = locale ?? "en";

  if (emojiLoadingPromise && currentLocale === targetLocale) {
    return emojiLoadingPromise;
  }

  currentLocale = targetLocale;
  emojiLoadingPromise = (async () => {
    const [emojiMartModule, emojiDataModule] = await Promise.all([
      import("emoji-mart"),
      import("@blocknote/emoji-data"),
    ]);

    const emojiMart =
      "default" in emojiMartModule ? emojiMartModule.default : emojiMartModule;

    let { emojiData } = emojiDataModule;

    if (targetLocale !== "en") {
      const overlay = await emojiDataModule.loadSearchData(targetLocale);
      if (overlay) {
        emojiData = emojiDataModule.applySearchOverlay(emojiData, overlay);
      }
    }

    await emojiMart.init({ data: emojiData as any });

    return { emojiMart, emojiData };
  })();

  return emojiLoadingPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EmojiPicker(props: any) {
  const ref = useRef(null);
  const instance = useRef(null) as any;

  if (instance.current) {
    instance.current.update(props);
  }

  useEffect(() => {
    void (async () => {
      const { emojiMart } = await loadEmojiMart(props.locale);

      instance.current = new emojiMart.Picker({ ...props, ref });
    })();

    return () => {
      instance.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return React.createElement("div", { ref });
}
