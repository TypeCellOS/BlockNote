type AnyBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: AnyBlock[];
};

const BLOCK_TOKEN_REGEX = /⟪FML_BLOCK_\d+⟫/g;
const INLINE_TOKEN_REGEX = /⟪FML_INLINE_\d+⟫/g;

export function postprocessBlocks<B extends AnyBlock>(
  blocks: B[],
  inlineMap: Map<string, string>,
  blockMap: Map<string, string>,
): B[] {
  const out: B[] = [];
  for (const block of blocks) {
    const wholeMatch = matchWholeBlockToken(block, blockMap);
    if (wholeMatch) {
      out.push({
        ...block,
        type: "formulaBlock",
        props: { latex: wholeMatch },
        content: undefined,
      } as B);
      continue;
    }
    if (Array.isArray(block.content)) {
      const rewritten = rewriteInlineTokens(block.content, inlineMap);
      out.push({
        ...block,
        content: rewritten,
        children: block.children
          ? postprocessBlocks(block.children, inlineMap, blockMap)
          : block.children,
      } as B);
    } else {
      out.push({
        ...block,
        children: block.children
          ? postprocessBlocks(block.children, inlineMap, blockMap)
          : block.children,
      } as B);
    }
  }
  return out;
}

function matchWholeBlockToken(
  block: AnyBlock,
  blockMap: Map<string, string>,
): string | null {
  if (!Array.isArray(block.content) || block.content.length !== 1) return null;
  const first = block.content[0] as { type?: string; text?: string };
  if (first.type !== "text" || typeof first.text !== "string") return null;
  const text = first.text.trim();
  if (!BLOCK_TOKEN_REGEX.test(text)) return null;
  // Reset regex state and re-match to grab the exact token
  BLOCK_TOKEN_REGEX.lastIndex = 0;
  const m = text.match(/^⟪FML_BLOCK_\d+⟫$/);
  if (!m) return null;
  return blockMap.get(m[0]) ?? null;
}

function rewriteInlineTokens(
  content: unknown[],
  inlineMap: Map<string, string>,
): unknown[] {
  const out: unknown[] = [];
  for (const node of content) {
    const n = node as { type?: string; text?: string; styles?: unknown };
    if (n.type !== "text" || typeof n.text !== "string") {
      out.push(node);
      continue;
    }
    const parts = splitAroundTokens(n.text, inlineMap);
    for (const part of parts) {
      if (part.kind === "text") {
        if (part.text.length > 0) {
          out.push({ ...n, text: part.text });
        }
      } else {
        out.push({
          type: "formulaInline",
          props: { latex: part.latex },
          content: undefined,
        });
      }
    }
  }
  return out;
}

function splitAroundTokens(
  text: string,
  inlineMap: Map<string, string>,
): Array<{ kind: "text"; text: string } | { kind: "formula"; latex: string }> {
  const parts: Array<
    { kind: "text"; text: string } | { kind: "formula"; latex: string }
  > = [];
  const re = /⟪FML_INLINE_\d+⟫/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", text: text.slice(last, m.index) });
    }
    const latex = inlineMap.get(m[0]);
    parts.push({ kind: "formula", latex: latex ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ kind: "text", text: text.slice(last) });
  }
  return parts;
}
