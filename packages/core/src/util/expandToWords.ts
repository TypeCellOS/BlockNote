import type { Node, ResolvedPos } from "prosemirror-model";

/**
 * Expands a range (start to end) to include the rest of the word if it starts or ends within a word
 */
export function expandPMRangeToWords(
  doc: Node,
  range: { $from: ResolvedPos; $to: ResolvedPos },
) {
  let { $from, $to } = range;

  // Expand Start
  // If the selection starts with a word character or punctuation, check if we need to expand left to include the rest of the word
  if ($from.pos > $from.start() && $from.pos < doc.content.size) {
    const charAfterStart = doc.textBetween($from.pos, $from.pos + 1);
    if (/^[\w\p{P}]$/u.test(charAfterStart)) {
      const textBefore = doc.textBetween($from.start(), $from.pos);
      const wordMatch = textBefore.match(/[\w\p{P}]+$/u);
      if (wordMatch) {
        $from = doc.resolve($from.pos - wordMatch[0].length);
      }
    }
  }

  // Expand End
  // If the selection ends with a word characte or punctuation, check if we need to expand right to include the rest of the word
  if ($to.pos < $to.end() && $to.pos > 0) {
    const charBeforeEnd = doc.textBetween($to.pos - 1, $to.pos);
    if (/^[\w\p{P}]$/u.test(charBeforeEnd)) {
      const textAfter = doc.textBetween($to.pos, $to.end());
      const wordMatch = textAfter.match(/^[\w\p{P}]+/u);
      if (wordMatch) {
        $to = doc.resolve($to.pos + wordMatch[0].length);
      }
    }
  }
  return { $from, $to, from: $from.pos, to: $to.pos };
}
