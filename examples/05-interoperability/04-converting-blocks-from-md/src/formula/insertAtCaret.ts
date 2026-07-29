import type { PaletteItem } from "./palettes";

export function insertAtCaret(
  textarea: HTMLTextAreaElement,
  item: PaletteItem,
): { value: string; caret: number } {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const value = before + item.snippet + after;
  const caretDelta = item.caretOffset ?? item.snippet.length;
  const caret = start + caretDelta;
  return { value, caret };
}
