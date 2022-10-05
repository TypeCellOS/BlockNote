import { mergeRegister } from "@lexical/utils";
import { LexicalEditor, ParagraphNode, TextNode } from "lexical";

export function registerAnimation(editor: LexicalEditor) {
  const preAnimationStates = new Map<string, any>();
  return mergeRegister(
    editor.registerNodeTransform(ParagraphNode, (paragraph) => {
      const key = paragraph.getKey();
      console.log("transform", key, paragraph);
      const domEl = editor._keyToDOMMap.get(key);
      if (!domEl) {
        return;
      }
      preAnimationStates.set(key, { left: domEl.getBoundingClientRect().left });
    }),
    //   editor.registerNodeTransform(ListItemNode, (item) => {
    //     const key = item.getKey();
    //     console.log('transform', key, item);
    //     const domEl = editor._keyToDOMMap.get(key);
    //     if (!domEl) {
    //       return;
    //     }
    //     preAnimationStates.set(key, {left: domEl.getBoundingClientRect().left});
    //   }),
    editor.registerNodeTransform(TextNode, (item) => {
      const key = item.getKey();
      console.log("transform", key, item);
      const domEl = editor._keyToDOMMap.get(key);
      if (!domEl) {
        return;
      }
      preAnimationStates.set(key, {
        fontSize: getComputedStyle(domEl).fontSize,
      });
    }),
    editor.registerUpdateListener((update) => {
      console.log("update", update);
      for (const [key, style] of preAnimationStates) {
        const domEl = editor._keyToDOMMap.get(key);
        if (!domEl) {
          return;
        }
        const newStyle = {
          fontSize: getComputedStyle(domEl).fontSize,
          left: domEl.getBoundingClientRect().left,
        };
        if (style.left && newStyle.left !== style.left) {
          // domEl.style.transfo;
          domEl.style.transition = "";
          domEl.style.translate = style.left - newStyle.left + "px";
          setTimeout(() => {
            domEl.style.transition = "translate 0.2s";
            domEl.style.translate = "";
          }, 0);
        }

        if (style.fontSize && newStyle.fontSize !== style.fontSize) {
          // domEl.style.transfo;

          domEl.style.transition = "";
          const oldStyle = domEl.style.fontSize;
          domEl.style.fontSize = style.fontSize;
          setTimeout(() => {
            domEl.style.transition = "font-size .2s";
            domEl.style.fontSize = oldStyle;
          }, 0);
        }
      }
      preAnimationStates.clear();
    })
  );
}
