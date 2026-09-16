import type { PartialBlock } from "@blocknote/core";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type SampleVersion = {
  name: string;
  /** How long ago the version was saved. */
  daysAgo: number;
  blocks: PartialBlock[];
};

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
    ...firstDraft.slice(-1),
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

/** Saved versions, oldest first. */
export const SAMPLE_HISTORY: SampleVersion[] = [
  { name: "First draft", daysAgo: 9, blocks: firstDraft },
  { name: "Added dates", daysAgo: 6, blocks: addedDates },
  { name: "Marketing review", daysAgo: 2, blocks: marketingReview },
];

/** The newest version with unsaved edits to compare against. */
export const LIVE_DOCUMENT: PartialBlock[] = [
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
