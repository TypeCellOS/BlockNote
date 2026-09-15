import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { docDiffToDelta } from "@blocknote/core/y";
import { docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import { encodeAny } from "lib0/buffer";

export const SAMPLE_DOCUMENT_TITLE = "Launch plan";

const DAY_MS = 24 * 60 * 60 * 1000;

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

const SAMPLE_VERSIONS: Array<{
  name?: string;
  daysAgo: number;
  by: string;
  blocks: PartialBlock[];
}> = [
  { name: "First draft", daysAgo: 9, by: "1", blocks: firstDraft },
  { name: "Added dates", daysAgo: 6, by: "2", blocks: addedDates },
  { name: "Marketing review", daysAgo: 2, by: "3", blocks: marketingReview },
  { daysAgo: 0.1, by: "4", blocks: liveDocument },
];

/**
 * Seed history as back-dated edits, each with its author and version name.
 * Names use the same timestamp keys as createYHubVersioningEndpoints.
 */
export async function seedSampleDocument(options: {
  baseUrl: string;
  org: string;
  docId: string;
}): Promise<void> {
  const url = `${options.baseUrl}/ydoc/v1/${options.org}/${options.docId}`;

  const ydoc = new Y.Doc({ gc: false });
  // The same root type the editor syncs (`doc.get()` in `DocumentEditor`).
  const fragment = ydoc.get();
  const versions = ydoc.get("__bn_versions");

  let previous: BlockNoteEditor["prosemirrorState"]["doc"] | undefined;
  let sent = Y.encodeStateVector(ydoc);
  for (const version of SAMPLE_VERSIONS) {
    // A headless editor turns the blocks into a ProseMirror document; the
    // delta from the previous version is what this edit writes.
    const pmDoc = BlockNoteEditor.create({ initialContent: version.blocks })
      .prosemirrorState.doc;
    const at = Math.floor(Date.now() - version.daysAgo * DAY_MS);
    ydoc.transact(() => {
      fragment.applyDelta(
        (previous ? docDiffToDelta(previous, pmDoc) : docToDelta(pmDoc)) as any,
      );
      if (version.name !== undefined) {
        versions.push([{ id: at, name: version.name }] as never);
      }
    });
    previous = pmDoc;

    // Only what this version added, in the V1 format YHub speaks.
    const update = Y.convertUpdateFormatV2ToV1(
      Y.encodeStateAsUpdateV2(ydoc, sent),
    );
    sent = Y.encodeStateVector(ydoc);

    const res = await fetch(url, {
      method: "PATCH",
      body: encodeAny({
        update,
        by: version.by,
        at,
        customAttributions: [],
      }) as BufferSource,
    });
    if (!res.ok) {
      throw new Error(
        `YHub seed request failed: ${res.status} ${res.statusText} (${url})`,
      );
    }
  }
}
