import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { docDiffToDelta } from "@blocknote/core/y";
import { docToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import { encodeAny } from "lib0/buffer";
import { generateRandomId } from "./utils.js";

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

type SeedOptions = { baseUrl: string; org: string };
type SeedPlan = { docId: string; patches: number[][] };

function seedKey(options: SeedOptions) {
  return `bn-multi-doc-seed:${options.baseUrl}/${options.org}`;
}

export function hasPendingSampleDocument(options: SeedOptions) {
  return localStorage.getItem(seedKey(options)) !== null;
}

function readSeedPlan(raw: string): SeedPlan {
  const plan: unknown = JSON.parse(raw);
  if (
    typeof plan !== "object" ||
    plan === null ||
    !("docId" in plan) ||
    typeof plan.docId !== "string" ||
    !("patches" in plan) ||
    !Array.isArray(plan.patches) ||
    !plan.patches.every(
      (patch: unknown): patch is number[] =>
        Array.isArray(patch) &&
        patch.every(
          (byte: unknown) =>
            typeof byte === "number" &&
            Number.isInteger(byte) &&
            byte >= 0 &&
            byte <= 255,
        ),
    )
  ) {
    throw new Error("Invalid saved sample seed plan");
  }
  return { docId: plan.docId, patches: plan.patches };
}

/**
 * Replay the same back-dated Yjs updates on every attempt. Replaying the prefix
 * reconciles partial remote success (including a lost PATCH response) before
 * sending the remaining updates: Yjs update identities make this idempotent.
 * Persist before the first request, independently of the local document index.
 */
export async function seedSampleDocument(
  options: SeedOptions,
): Promise<string> {
  const key = seedKey(options);
  const saved = localStorage.getItem(key);
  const plan = saved ? readSeedPlan(saved) : createSeedPlan();
  if (!saved) {
    localStorage.setItem(key, JSON.stringify(plan));
  }
  const url = `${options.baseUrl}/ydoc/v1/${options.org}/${plan.docId}`;
  for (const patch of plan.patches) {
    const res = await fetch(url, {
      method: "PATCH",
      body: new Uint8Array(patch),
    });
    if (!res.ok) {
      throw new Error(
        `YHub seed request failed: ${res.status} ${res.statusText} (${url})`,
      );
    }
  }
  return plan.docId;
}

function createSeedPlan(): SeedPlan {
  const patches: number[][] = [];
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
      if (previous) {
        fragment.applyDelta(docDiffToDelta(previous, pmDoc));
      } else {
        fragment.applyDelta(docToDelta(pmDoc));
      }
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

    patches.push(
      Array.from(
        encodeAny({
          update,
          by: version.by,
          at,
          customAttributions: [],
        }),
      ),
    );
  }
  ydoc.destroy();
  return { docId: generateRandomId(6), patches };
}
