import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

export const DAY_MS = 24 * 60 * 60 * 1000;

// Stable ids let previews show edits to the same blocks across versions.
type SampleBlock = PartialBlock & {
  id: string;
  type: "heading" | "paragraph" | "bulletListItem" | "numberedListItem";
  content: string;
};

function updateContent(blocks: SampleBlock[], updates: Record<string, string>) {
  return blocks.map((block) => ({
    ...block,
    content: updates[block.id] ?? block.content,
  }));
}

const firstDraft: SampleBlock[] = [
  {
    id: "title",
    type: "heading",
    props: { level: 2 },
    content: "Launch plan: Notes 2.0",
  },
  {
    id: "goal",
    type: "paragraph",
    content:
      "Goal: ship the new editor to every workspace before the end of the quarter.",
  },
  {
    id: "milestones",
    type: "heading",
    props: { level: 3 },
    content: "Milestones",
  },
  {
    id: "m1",
    type: "bulletListItem",
    content: "Beta with five design partners",
  },
  { id: "m3", type: "bulletListItem", content: "Public release" },
];

const addedDates = updateContent(
  [
    ...firstDraft.slice(0, -1),
    {
      id: "m2",
      type: "bulletListItem",
      content: "Fix the ten most-reported beta issues",
    },
    firstDraft[firstDraft.length - 1]!,
  ],
  {
    goal: "Goal: ship the new editor to every workspace before the end of September.",
    m1: "Beta with five design partners (June)",
    m3: "Public release (September)",
  },
);

const marketingReview: SampleBlock[] = [
  ...updateContent(addedDates, { m3: "Public release (September 15)" }),
  {
    id: "announcement",
    type: "heading",
    props: { level: 3 },
    content: "Announcement",
  },
  {
    id: "announcement-text",
    type: "paragraph",
    content:
      "The blog post and changelog entry go out on release day. The newsletter follows a week later.",
  },
];

const liveDocument: SampleBlock[] = [
  ...updateContent(marketingReview, {
    goal: "Goal: ship the new editor to every workspace before the end of September, keeping the old editor available as a fallback for one release.",
  }),
  {
    id: "questions",
    type: "heading",
    props: { level: 3 },
    content: "Open questions",
  },
  {
    id: "q1",
    type: "numberedListItem",
    content: "Do we keep the old editor available as a fallback?",
  },
  {
    id: "q2",
    type: "numberedListItem",
    content: "Who owns the migration guide?",
  },
];

export const SAMPLE_HISTORY: Array<{
  name: string;
  daysAgo: number;
  blocks: PartialBlock[];
}> = [
  { name: "First draft", daysAgo: 9, blocks: firstDraft },
  { name: "Added dates", daysAgo: 6, blocks: addedDates },
  { name: "Marketing review", daysAgo: 2, blocks: marketingReview },
];

export const LIVE_DOCUMENT: PartialBlock[] = liveDocument;

/** Encode sample blocks as a stored Yjs version. */
export function blocksToUpdate(
  blocks: PartialBlock[],
  fragmentName: string,
): Uint8Array {
  const editor = BlockNoteEditor.create({ initialContent: blocks });
  const doc = new Y.Doc();
  prosemirrorToYXmlFragment(
    editor.prosemirrorState.doc,
    doc.getXmlFragment(fragmentName),
  );
  return Y.encodeStateAsUpdate(doc);
}
