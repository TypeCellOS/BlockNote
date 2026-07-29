export type PreprocessResult = {
  processed: string;
  inlineMap: Map<string, string>;
  blockMap: Map<string, string>;
};

const BLOCK_TOKEN = (n: number) => `⟪FML_BLOCK_${n}⟫`;
const INLINE_TOKEN = (n: number) => `⟪FML_INLINE_${n}⟫`;

const BLOCK_REGEX = /\$\$([\s\S]+?)\$\$/g;
const INLINE_REGEX = /\$([^$\n]+?)\$/g;

export function preprocessMarkdown(md: string): PreprocessResult {
  const blockMap = new Map<string, string>();
  const inlineMap = new Map<string, string>();
  let blockCounter = 0;
  let inlineCounter = 0;

  // First: block-level $$...$$
  let processed = md.replace(BLOCK_REGEX, (_full, latex: string) => {
    const token = BLOCK_TOKEN(blockCounter++);
    blockMap.set(token, latex.trim());
    return `\n\n${token}\n\n`;
  });

  // Then: inline $...$
  processed = processed.replace(INLINE_REGEX, (_full, latex: string) => {
    const token = INLINE_TOKEN(inlineCounter++);
    inlineMap.set(token, latex.trim());
    return token;
  });

  return { processed, inlineMap, blockMap };
}
