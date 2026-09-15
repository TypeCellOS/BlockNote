import type { PartialBlock } from "@blocknote/core";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type SampleVersion = {
  name: string;
  /** How long ago the version was saved. */
  daysAgo: number;
  blocks: PartialBlock[];
};

/**
 * A short launch-plan document at three points in its history, oldest first.
 * Block ids are stable across versions so that a diff between two of them
 * shows what actually changed rather than a wholesale replacement.
 */
export const SAMPLE_HISTORY: SampleVersion[] = [
  {
    name: "First draft",
    daysAgo: 9,
    blocks: [
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
    ],
  },
  {
    name: "Added dates",
    daysAgo: 6,
    blocks: [
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
          "Goal: ship the new editor to every workspace before the end of September.",
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
        content: "Beta with five design partners (June)",
      },
      {
        id: "m2",
        type: "bulletListItem",
        content: "Fix the ten most-reported beta issues",
      },
      {
        id: "m3",
        type: "bulletListItem",
        content: "Public release (September)",
      },
    ],
  },
  {
    name: "Marketing review",
    daysAgo: 2,
    blocks: [
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
          "Goal: ship the new editor to every workspace before the end of September.",
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
        content: "Beta with five design partners (June)",
      },
      {
        id: "m2",
        type: "bulletListItem",
        content: "Fix the ten most-reported beta issues",
      },
      {
        id: "m3",
        type: "bulletListItem",
        content: "Public release (September 15)",
      },
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
    ],
  },
];

/**
 * The document as it is now: the newest version plus edits nobody has saved
 * yet, so the current version has something to compare against.
 */
export const LIVE_DOCUMENT: PartialBlock[] = [
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
      "Goal: ship the new editor to every workspace before the end of September, keeping the old editor available as a fallback for one release.",
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
    content: "Beta with five design partners (June)",
  },
  {
    id: "m2",
    type: "bulletListItem",
    content: "Fix the ten most-reported beta issues",
  },
  {
    id: "m3",
    type: "bulletListItem",
    content: "Public release (September 15)",
  },
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
