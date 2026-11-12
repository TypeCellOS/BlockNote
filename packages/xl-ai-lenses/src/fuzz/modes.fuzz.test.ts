import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

import { createRandom } from "./random.js";
import { createProposalWorld } from "./proposalWorld.js";
import {
  runScenario,
  type ScenarioOptions,
  type World,
  type WorldContext,
} from "./scenario.js";
import { createYjs14World } from "./yjs14World.js";

// The scenarios of `scenario.ts` for each mode of the document agent. The
// scenario code and the rules are the same for all modes. Each variant has
// a list of the rules that it is known to break.
//
// The number of seeds for each variant is small in a normal test run. Set
// DOCUMENT_AGENT_FUZZ_SEEDS for more, DOCUMENT_AGENT_FUZZ_START for the
// first seed, and DOCUMENT_AGENT_FUZZ_REPORT for a file with each problem.

const SEEDS = Number(process.env.DOCUMENT_AGENT_FUZZ_SEEDS ?? 5);
const START = Number(process.env.DOCUMENT_AGENT_FUZZ_START ?? 1);

// jsdom has no layout: it does not have `scrollIntoView`.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

type Variant = ScenarioOptions & {
  name: string;
  createWorld: (context: WorldContext) => World;
  /** The rules that the variant is known to break. */
  known: string[];
};

/**
 * The rules that the proposal mode without the accept guard is known to
 * break if the requests to the host have a delay. An accept is a write of
 * the editor to the document, and a message to the host. The two are not
 * in one order:
 *
 * - A run can start before the host has the message. Its rebase finds the
 *   accepted change in the main document and in the proposal, and the
 *   proposal gets a new paragraph two times.
 * - The host shows an accepted tool call as open, and the reviewer can
 *   reject it after that.
 *
 * With `acceptGuard`, the host has the accept before the editor writes.
 */
const PROPOSAL_WITHOUT_GUARD = ["no-text-twice", "accepted-change-stays"];

/**
 * The rules that two reviewers in proposal mode without a guard are known
 * to break, more than {@link PROPOSAL_WITHOUT_GUARD}: the two can accept
 * the same change (see the tests "KNOWN: two users who accept ..." of the
 * extension). For a new block, each accept inserts a block with the ID of
 * the proposal:
 *
 * - The shared document has that block ID two times.
 * - Each editor gives new IDs to the two blocks in its own view. The new
 *   IDs go to the shared document only with the next change of that user.
 *   Until then, the editors do not agree on the IDs of these blocks.
 */
const PROPOSAL_WITHOUT_GUARD_TWO_REVIEWERS = [
  ...PROPOSAL_WITHOUT_GUARD,
  "block-ids-different",
  "editor-shows-its-document",
];

/**
 * The rules that two reviewers in Yjs 14 mode are known to break. There is
 * no host that gives the decisions an order. Thus, the two reviewers can
 * make different decisions for one tool call at the same time, and the
 * reject is the result.
 *
 * - `user-change-in-rejected-block`: a user typed in a block that the tool
 *   call added, after the accept. The reject removes the block, with the
 *   text of the user. This is the same as a removal of a block and an edit
 *   in it at the same time in each Yjs document.
 * - `no-exception-in-review`: the attribution extension of core throws for
 *   a mark of an attribute change without a value
 *   (`core/src/y/extensions/YAttributionMarks.ts`, `getAttributionUserIds`).
 * - `no-text-twice`: two rejects of one suggested deletion at the same time
 *   (see the test "KNOWN: two users who reject ..." of the Yjs 14 mode).
 */
const YJS14_TWO_REVIEWERS = [
  "user-change-in-rejected-block",
  "no-exception-in-review",
  "no-text-twice",
];

function proposal(guard: boolean) {
  return (context: WorldContext) => createProposalWorld(context, { guard });
}

const VARIANTS: Variant[] = [
  {
    name: "proposal mode, one reviewer, with the accept guard",
    createWorld: proposal(true),
    reviewers: 1,
    delay: true,
    wordConflicts: false,
    known: [],
  },
  {
    name: "proposal mode, two reviewers, with the accept guard",
    createWorld: proposal(true),
    reviewers: 2,
    delay: true,
    wordConflicts: false,
    known: [],
  },
  {
    name: "proposal mode, two reviewers, with the accept guard, conflicts between a user and the agent",
    createWorld: proposal(true),
    reviewers: 2,
    delay: true,
    wordConflicts: true,
    known: [],
  },
  {
    name: "proposal mode, one reviewer, no guard, no delay",
    createWorld: proposal(false),
    reviewers: 1,
    delay: false,
    wordConflicts: false,
    known: [],
  },
  {
    name: "proposal mode, two reviewers, no guard, no delay",
    createWorld: proposal(false),
    reviewers: 2,
    delay: false,
    wordConflicts: false,
    known: [],
  },
  {
    name: "proposal mode, one reviewer, no guard, with a delay",
    createWorld: proposal(false),
    reviewers: 1,
    delay: true,
    wordConflicts: false,
    known: PROPOSAL_WITHOUT_GUARD,
  },
  {
    name: "proposal mode, two reviewers, no guard, with a delay",
    createWorld: proposal(false),
    reviewers: 2,
    delay: true,
    wordConflicts: false,
    known: PROPOSAL_WITHOUT_GUARD_TWO_REVIEWERS,
  },
  {
    name: "Yjs 14 mode, one reviewer",
    createWorld: createYjs14World,
    reviewers: 1,
    delay: true,
    wordConflicts: false,
    known: [],
  },
  {
    name: "Yjs 14 mode, two reviewers",
    createWorld: createYjs14World,
    reviewers: 2,
    delay: true,
    wordConflicts: false,
    known: YJS14_TWO_REVIEWERS,
  },
];

describe("the document agent with random concurrent edits", () => {
  const report: unknown[] = [];

  it.each(VARIANTS)(
    "keeps its rules: $name",
    { timeout: 600_000 },
    async (variant) => {
      const failures: string[] = [];
      const totals: Record<string, number> = {};
      for (let seed = START; seed < START + SEEDS; seed++) {
        const { problems, log, stats } = await runScenario(
          createRandom(seed),
          variant,
          variant.createWorld,
        );
        for (const [name, count] of Object.entries(stats)) {
          totals[name] = (totals[name] ?? 0) + count;
        }
        const unknown = problems.filter(
          (problem) => !variant.known.includes(problem.rule),
        );
        if (problems.length > 0) {
          report.push({ variant: variant.name, seed, problems, log });
        }
        if (unknown.length > 0) {
          failures.push(
            `seed ${seed}: ${unknown
              .map((problem) => `${problem.rule} (${problem.detail})`)
              .join("; ")}`,
          );
        }
      }
      report.push({ variant: variant.name, seeds: SEEDS, totals });
      // Each variant must do the work that its rules are about.
      expect(totals.userEdits).toBeGreaterThan(0);
      expect(totals.toolCalls).toBeGreaterThan(0);
      expect(totals.accepts).toBeGreaterThan(0);
      if (process.env.DOCUMENT_AGENT_FUZZ_REPORT !== undefined) {
        writeFileSync(
          process.env.DOCUMENT_AGENT_FUZZ_REPORT,
          JSON.stringify(report, undefined, 1),
        );
      }
      expect(failures).toEqual([]);
    },
  );
});
