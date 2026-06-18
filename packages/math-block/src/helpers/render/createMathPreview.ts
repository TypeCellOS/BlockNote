import type { CodeBlockPreview } from "@blocknote/core";
import katex from "katex";
import "katex/dist/katex.min.css";
import { getMathSource } from "../getMathSource.js";

export const createMathPreview: CodeBlockPreview = (block) => {
  const source = getMathSource(block);

  // Render with `throwOnError: true` first so we can check for syntax errors.
  let html: string;
  let error: string | null = null;
  try {
    html = katex.renderToString(source, {
      throwOnError: true,
      displayMode: true,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    html = katex.renderToString(source, {
      throwOnError: false,
      displayMode: true,
    });
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  const dom = template.content.firstElementChild as HTMLElement;

  return { dom, error };
};
