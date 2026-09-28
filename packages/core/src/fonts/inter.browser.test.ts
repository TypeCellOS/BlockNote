import { expect, it } from "vite-plus/test";

import "./inter.css";
import "../editor/editor.css";

// Use the shipped font and editor styles. Measuring layout in a real browser
// catches drift in both the fallback descriptors and the default font stack.
it("makes the pre-load editor text closer to Inter's metrics", async () => {
  const editor = document.createElement("div");
  editor.className = "bn-editor bn-default-styles";
  editor.style.width = "360px";
  editor.style.boxSizing = "content-box";
  const paragraph = document.createElement("div");
  paragraph.textContent =
    "BlockNote editors display text in many shapes and sizes. A font load should not cause nearby paragraphs, headings or controls to jump unexpectedly. Repeated words make wrapping differences visible while keeping every trial exactly the same. ".repeat(
      3,
    );
  const measure = document.createElement("span");
  measure.textContent =
    "BlockNote editors display text in many shapes and sizes.";
  measure.style.whiteSpace = "nowrap";
  editor.append(measure);
  editor.append(paragraph);
  document.body.append(editor);

  try {
    const fontStack = getComputedStyle(editor).fontFamily;
    expect(fontStack).toContain('"Inter fallback"');

    // Explicitly select each pre-load font to keep the measurement independent
    // of network timing and font-display implementation differences.
    const fallbackStack = fontStack.replace(/^"?Inter"?,\s*/, "");
    editor.style.fontFamily = fallbackStack;
    await document.fonts.load('400 16px "Inter fallback"');
    const adjustedHeight = paragraph.getBoundingClientRect().height;
    const adjustedWidth = measure.getBoundingClientRect().width;

    editor.style.fontFamily = fallbackStack.replace(/"Inter fallback",\s*/, "");
    const originalWidth = measure.getBoundingClientRect().width;

    editor.style.fontFamily = '"Inter"';
    await document.fonts.load('400 16px "Inter"');
    const interHeight = paragraph.getBoundingClientRect().height;
    const interWidth = measure.getBoundingClientRect().width;

    const originalWidthError = Math.abs(originalWidth - interWidth);
    const adjustedWidthError = Math.abs(adjustedWidth - interWidth);
    expect(originalWidthError).toBeGreaterThan(20);
    expect(adjustedWidthError).toBeLessThan(5);
    expect(adjustedWidthError).toBeLessThan(originalWidthError / 2);
    // Line wrapping can differ by an entire line even when glyph widths are
    // close, and the old system stack can occasionally wrap closer by chance.
    expect(Math.abs(adjustedHeight - interHeight)).toBeLessThan(18);
  } finally {
    editor.remove();
  }
});
