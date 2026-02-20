/**
 * Converts an LLM's file_replace tool call into BlockNote operations:
 * - UPDATE: replacement element has ID matching existing block
 * - ADD: replacement element has no ID (or unknown ID)
 * - DELETE: block in target, but ID not in replacement
 *
 * Uses a two-pointer walk: iterates replacement elements in order while
 * maintaining a cursor into the original affected blocks. This naturally
 * handles streaming, reordering, and deletions.
 *
 * Streaming consistency: calling with replacement.slice(0, N) returns
 * a prefix-subset of calling with the full replacement. Deletes are
 * only emitted when isPossiblyPartial = false.
 */

import type { AddBlocksToolCall } from "../../base-tools/createAddBlocksTool.js";
import type { UpdateBlockToolCall } from "../../base-tools/createUpdateBlockTool.js";
import type { DeleteBlockToolCall } from "../../base-tools/delete.js";

export type TsxToolCall =
  | AddBlocksToolCall<string>
  | UpdateBlockToolCall<string>
  | DeleteBlockToolCall;

/**
 * Character range of a block in the document string.
 * `start` is inclusive, `end` is exclusive (matches `String.substring` semantics).
 */
export type BlockRange = {
  start: number;
  end: number;
};

export type ConvertOptions = {
  document: string;
  blockRanges: Map<string, BlockRange>;
  target: string;
  replacement: string;
  isPossiblyPartial: boolean;
};

type ParsedElement = { content: string; id: string | null };

/** Parse TSX string into top-level elements with their IDs. */
function parseElements(tsx: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  const pattern = /<([A-Z][a-zA-Z0-9]*)\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let match;
  while ((match = pattern.exec(tsx)) !== null) {
    const idMatch = match[2].match(/id=(["'])(.*?)\1/);
    elements.push({ content: match[0], id: idMatch ? idMatch[2] : null });
  }
  return elements;
}

/**
 * Extract complete elements from potentially incomplete TSX (streaming).
 * Strips incomplete trailing tags and closes any unclosed tags.
 */
function getPartialTsx(tsx: string): string {
  const lastOpen = tsx.lastIndexOf("<");
  const lastClose = tsx.lastIndexOf(">");
  let processed = lastOpen > lastClose ? tsx.substring(0, lastOpen) : tsx;

  const openTags: string[] = [];
  const tagPattern = /<\/?([A-Z][a-zA-Z0-9]*)/g;
  let m;
  while ((m = tagPattern.exec(processed)) !== null) {
    if (m[0].startsWith("</")) {
      if (openTags.length > 0 && openTags[openTags.length - 1] === m[1]) {
        openTags.pop();
      }
    } else {
      const tagEnd = processed.indexOf(">", m.index);
      if (tagEnd !== -1 && processed[tagEnd - 1] !== "/") {
        openTags.push(m[1]);
      }
    }
  }
  for (let i = openTags.length - 1; i >= 0; i--) {
    processed += `</${openTags[i]}>`;
  }
  return processed.trim();
}

/** Check if a block is fully contained within the target range. */
function isFullyContained(
  range: BlockRange,
  targetStart: number,
  targetEnd: number,
): boolean {
  return range.start >= targetStart && range.end <= targetEnd;
}

/**
 * Check if `candidate` is a prefix of `full` (ignoring trailing closing tags).
 * Used during streaming to detect that auto-closed content is just a truncated
 * version of the original — not a real change.
 */
function isPrefixOf(candidate: string, full: string): boolean {
  const strip = (s: string) => s.replace(/(<\/[A-Z][a-zA-Z0-9]*>\s*)+$/g, "");
  const strippedCandidate = strip(candidate);
  const strippedFull = strip(full);
  return (
    strippedCandidate !== strippedFull &&
    strippedFull.startsWith(strippedCandidate)
  );
}

/**
 * For a partially-overlapping block, splice the replacement into the
 * overlapping portion and return the updated block content.
 */
function spliceBlock(
  document: string,
  range: BlockRange,
  targetStart: number,
  targetEnd: number,
  replacementText: string,
): string {
  const original = document.substring(range.start, range.end);
  const relStart = Math.max(0, targetStart - range.start);
  const relEnd = Math.min(original.length, targetEnd - range.start);
  return (
    original.substring(0, relStart) +
    replacementText +
    original.substring(relEnd)
  );
}

/**
 * For a partially-overlapping block that was "skipped" (not matched),
 * trim the consumed portion without inserting replacement text.
 */
function trimBlock(
  document: string,
  range: BlockRange,
  targetStart: number,
  targetEnd: number,
): string {
  return spliceBlock(document, range, targetStart, targetEnd, "");
}

export function convertFileReplaceToolCall(
  options: ConvertOptions,
): TsxToolCall[] {
  const { document, blockRanges, target, replacement, isPossiblyPartial } =
    options;
  const result: TsxToolCall[] = [];

  // Step 1: Locate target in document
  const targetStart = document.indexOf(target);
  if (targetStart === -1) return result;
  const targetEnd = targetStart + target.length;

  // Step 2: Prepare replacement (handle streaming)
  const processedReplacement = isPossiblyPartial
    ? getPartialTsx(replacement)
    : replacement;
  if (!processedReplacement && replacement) return result;

  // Step 3: Find affected blocks, sorted by document position
  const allAffected: string[] = [];
  for (const [id, range] of blockRanges) {
    if (range.start < targetEnd && range.end > targetStart) {
      allAffected.push(id);
    }
  }
  allAffected.sort(
    (a, b) => blockRanges.get(a)!.start - blockRanges.get(b)!.start,
  );

  if (allAffected.length === 0) return result;

  // Step 4: Parse replacement elements
  const elements = parseElements(processedReplacement);

  // Build a set to quickly check if an ID is in the affected window
  const affectedSet = new Set(allAffected);

  // If no parseable elements: find-and-replace on the document level.
  // The first block absorbs the replacement text + the tail of the last block.
  // All other affected blocks are deleted.
  if (elements.length === 0) {
    const firstId = allAffected[0];
    const firstRange = blockRanges.get(firstId)!;
    const lastId = allAffected[allAffected.length - 1];
    const lastRange = blockRanges.get(lastId)!;

    // Build the new first block: content before target + replacement + content after target
    const beforeTarget = document.substring(firstRange.start, targetStart);
    const afterTarget = document.substring(targetEnd, lastRange.end);
    const newFirstBlock = beforeTarget + processedReplacement + afterTarget;
    const originalFirst = document.substring(firstRange.start, firstRange.end);

    if (newFirstBlock !== originalFirst) {
      if (!newFirstBlock.trim() && !isPossiblyPartial) {
        // If content is empty/whitespace only after replacement, treat as DELETE
        result.push({ type: "delete", id: firstId });
      } else {
        result.push({ type: "update", id: firstId, block: newFirstBlock });
      }
    }

    // All other affected blocks → DELETE
    for (let i = 1; i < allAffected.length; i++) {
      if (!isPossiblyPartial) {
        result.push({ type: "delete", id: allAffected[i] });
      }
    }
    return result;
  }

  // Step 5: Two-pointer walk
  let cursor = 0; // index into allAffected
  let lastRefId = allAffected[0];
  let seenExisting = false; // have we seen any existing block in the walk?
  const consumed = new Set<string>(); // IDs we've already passed
  let pendingAdds: string[] = []; // buffer for batching consecutive ADDs

  /** Flush buffered ADDs as a single batched operation. */
  function flushAdds() {
    if (pendingAdds.length === 0) return;
    result.push({
      type: "add",
      referenceId: lastRefId,
      position: seenExisting ? "after" : "before",
      blocks: [...pendingAdds],
    });
    pendingAdds = [];
  }

  for (const element of elements) {
    if (
      element.id &&
      affectedSet.has(element.id) &&
      !consumed.has(element.id)
    ) {
      // CASE A: element matches an original block ahead of cursor
      flushAdds(); // flush pending adds before processing this block

      const matchIdx = allAffected.indexOf(element.id, cursor);

      if (matchIdx === -1) {
        // Shouldn't happen if !consumed and in affectedSet, but guard
        continue;
      }

      // Skip (delete/trim) blocks between cursor and matchIdx
      for (let i = cursor; i < matchIdx; i++) {
        const skipId = allAffected[i];
        const skipRange = blockRanges.get(skipId)!;
        consumed.add(skipId);

        if (isFullyContained(skipRange, targetStart, targetEnd)) {
          // Safe to delete even during streaming: this block was definitively
          // skipped because a later block appeared first in the replacement.
          result.push({ type: "delete", id: skipId });
        } else {
          // Edge block: trim consumed portion
          const trimmed = trimBlock(
            document,
            skipRange,
            targetStart,
            targetEnd,
          );
          const original = document.substring(skipRange.start, skipRange.end);
          if (trimmed !== original) {
            result.push({ type: "update", id: skipId, block: trimmed });
          }
        }
      }

      // Process the matched block
      const matchRange = blockRanges.get(element.id)!;
      consumed.add(element.id);

      if (isFullyContained(matchRange, targetStart, targetEnd)) {
        // Fully contained: UPDATE if content changed
        const original = document.substring(matchRange.start, matchRange.end);
        if (element.content !== original) {
          // During streaming, suppress if content is just a truncated original
          if (isPossiblyPartial && isPrefixOf(element.content, original)) {
            // streaming artifact — don't update yet
          } else {
            result.push({
              type: "update",
              id: element.id,
              block: element.content,
            });
          }
        }
      } else {
        // Edge block: merge — replace the overlapping portion with element content
        const merged = spliceBlock(
          document,
          matchRange,
          targetStart,
          targetEnd,
          element.content,
        );
        const original = document.substring(matchRange.start, matchRange.end);
        if (merged !== original) {
          // During streaming, suppress if merged content is just a truncated original
          if (isPossiblyPartial && isPrefixOf(merged, original)) {
            // streaming artifact — don't update yet
          } else {
            result.push({ type: "update", id: element.id, block: merged });
          }
        }
      }

      cursor = matchIdx + 1;
      lastRefId = element.id;
      seenExisting = true;
    } else if (element.id && consumed.has(element.id)) {
      // CASE B: already-passed block (reorder) → buffer for add
      pendingAdds.push(element.content);
    } else if (
      element.id &&
      blockRanges.has(element.id) &&
      !affectedSet.has(element.id)
    ) {
      // CASE C: references a block outside the target range
      // Skip — adding it would duplicate an existing block
      continue;
    } else {
      // CASE D: new block (no ID or unknown ID) → buffer for add
      pendingAdds.push(element.content);
    }
  }

  // Flush any remaining buffered ADDs
  flushAdds();

  // Remaining blocks after cursor → delete/trim
  for (let i = cursor; i < allAffected.length; i++) {
    const id = allAffected[i];
    if (consumed.has(id)) continue;
    const range = blockRanges.get(id)!;

    if (isFullyContained(range, targetStart, targetEnd)) {
      if (!isPossiblyPartial) {
        result.push({ type: "delete", id });
      }
    } else {
      // Edge block: trim consumed portion
      const trimmed = trimBlock(document, range, targetStart, targetEnd);
      const original = document.substring(range.start, range.end);
      if (trimmed !== original) {
        result.push({ type: "update", id, block: trimmed });
      }
    }
  }

  return result;
}
