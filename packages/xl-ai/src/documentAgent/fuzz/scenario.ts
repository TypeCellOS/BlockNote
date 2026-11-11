import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";

import type { LensBlock } from "../../api/v2/index.js";
import type { createRandom } from "../../api/v2/testUtil/random.js";
import { type ScriptedStep, textOf } from "../testUtil.js";

// A scenario with random concurrent edits for one document, for each mode
// of the document agent. The scenario and its rules are in this file. A
// mode gives a `World`: its editors, its network, its agent and its review
// (see `proposalWorld.ts` and `yjs14World.ts`).
//
// One scenario:
//
// - Three users, each with an editor and a replica of the document. An
//   editor and the server exchange their updates at random times: this is
//   the network.
// - An agent with a mock model. A run makes one to three random tool
//   calls. Each change of the agent has a marker word (`AX<n>Z`).
// - Users change the document, also while the agent works. Each change of
//   a user has a marker word (`UX<n>Z`).
// - One or two reviewers accept or reject one tool call or all open tool
//   calls.
//
// At the end, all requests arrive, all editors sync, and a reviewer accepts
// what is open. Then the scenario examines the rules of `problemsOf`.

export type Random = ReturnType<typeof createRandom>;

/** One problem of a scenario: a broken rule, with a short detail. */
export type Problem = { rule: string; detail: string };

/**
 * An exception that a world found in one of its parts, with the rule that
 * it breaks. The scenario stops, and records the problem with that rule.
 */
export class RuleError extends Error {
  constructor(
    readonly rule: string,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.stack = cause instanceof Error ? cause.stack : this.stack;
  }
}

/** A user of the document. */
export type FuzzClient = {
  name: string;
  editor: BlockNoteEditor<any, any, any>;
};

/** What the agent can read at the start of an LLM step: its document, as markdown, at a version. */
export type AgentText = { version: string; markdown: string };

/** What a world gets from the scenario. */
export type WorldContext = {
  random: Random;
  /** The document at the start. */
  blocks: PartialBlock[];
  /** The number of users that review (of three users). */
  reviewers: 1 | 2;
  /** Gives the next LLM step of the mock model of the agent. */
  agentStep(): ScriptedStep;
  /** Records a problem that a world finds during the scenario. */
  problem(problem: Problem): void;
};

/** The document agent of one mode, with three users, for one scenario. */
export type World = {
  clients: FuzzClient[];
  reviewers: FuzzClient[];

  // ---- The network.
  /** Exchanges the updates of one user and the server. */
  sync(client: FuzzClient): void;
  /** Delivers one request of the user to the host that waits, if there is one. */
  deliver(client: FuzzClient): Promise<void>;
  /** Delivers all requests that wait. */
  deliverAll(): Promise<void>;

  // ---- The users.
  /** Returns true if the user can change the document in the editor now. */
  canEdit(client: FuzzClient): boolean;
  /**
   * The blocks of the main document that the user can change, with the IDs
   * that the editor of the user has for them.
   */
  blocksForEdit(client: FuzzClient): LensBlock[];
  /** The main document of the user: the document without suggestions. */
  mainOf(client: FuzzClient): LensBlock[];
  /** The main document of the server. */
  sharedMain(): LensBlock[];

  // ---- The agent.
  /** The document of the agent now, or `undefined` before its first read. */
  agentText(): AgentText | undefined;
  /** An earlier version of the document of the agent, if there is one. */
  earlierAgentText(random: Random): AgentText | undefined;
  /** Runs the agent to the end: the mock model gets its steps from the scenario. */
  runAgent(): Promise<void>;

  // ---- The review.
  /** Gives the user the newest state of the review, if the mode needs a step for this. */
  refresh(client: FuzzClient): Promise<void>;
  /** Returns true while a decision of the user waits for an answer of the host. */
  isBusy(client: FuzzClient): boolean;
  /** The tool calls that the user can decide on now. */
  openToolCalls(client: FuzzClient): string[];
  /**
   * The decisions of a reviewer. `onAccept` is called when the accept
   * applies: at once, or after an answer of the host.
   */
  acceptToolCall(
    client: FuzzClient,
    toolCallId: string,
    onAccept: () => void,
  ): void;
  rejectToolCall(client: FuzzClient, toolCallId: string): void;
  acceptAll(client: FuzzClient, onAccept: () => void): void;
  rejectAll(client: FuzzClient): void;
  /** Returns true if the document has no open review. */
  reviewEnded(): Promise<boolean>;

  // ---- The end.
  /** The problems of the mode at the end of the scenario. */
  problemsAtEnd(): Problem[];
  /** What the mode did, for the report (for example the number of rebases). */
  stats(): Record<string, number>;
  destroy(): void;
};

/** The options of a scenario that do not depend on the mode. */
export type ScenarioOptions = {
  reviewers: 1 | 2;
  /**
   * A user can replace a word in the middle of a block. Then a change of
   * the agent to the same word is in conflict, and the change of the user
   * stays: a marker word of the agent can be missing.
   */
  wordConflicts: boolean;
  /**
   * False: after each decision of a reviewer and after each run, all
   * requests arrive and each reviewer gets the newest state. True: these
   * steps come at random later times.
   */
  delay: boolean;
};

const ACTIONS = 60;
/** The kinds of a review action: 0 accept all, 1 reject all, 2 accept one, 3 reject one. */
const REVIEW_KINDS = [0, 0, 1, 2, 2, 2, 3, 3];

/** Sentences with different words, for the document at the start. */
const SENTENCES = [
  "Maintainers review each change before they merge it.",
  "A license tells people what they can do with the code.",
  "Tests run automatically after every commit.",
  "Good documentation helps new users to start quickly.",
  "A release has a version number and a list of changes.",
  "Security problems are reported in private first.",
  "Volunteers translate the texts into many languages.",
  "Sponsors pay for the work of some developers.",
];

/** The marker words of the agent in a text. */
function agentTokensIn(text: string): string[] {
  return text.match(/AX\d+Z/g) ?? [];
}

/** The blocks that only one of two documents has, as text. */
export function differenceOf(
  a: readonly LensBlock[],
  b: readonly LensBlock[],
): string {
  const inA = new Set(a.map((block) => JSON.stringify(block)));
  const inB = new Set(b.map((block) => JSON.stringify(block)));
  function only(
    blocks: readonly LensBlock[],
    other: ReadonlySet<string>,
  ): string {
    return blocks
      .filter((block) => !other.has(JSON.stringify(block)))
      .map((block) => `${block.id.slice(0, 6)} "${textOf(block)}"`)
      .join(", ");
  }
  return `only the first: [${only(a, inB)}], only the second: [${only(b, inA)}], blocks: ${a.length} and ${b.length}`;
}

/** Runs one scenario, and returns its problems, the log of its actions, and what it did. */
export async function runScenario(
  random: Random,
  options: ScenarioOptions,
  createWorld: (context: WorldContext) => World,
) {
  const log: string[] = [];
  const problems: Problem[] = [];
  /** What the scenario did: a scenario that does nothing breaks no rule. */
  const stats = { userEdits: 0, toolCalls: 0, accepts: 0, rejects: 0 };
  let tokens = 0;
  function nextToken(kind: "A" | "U"): string {
    return `${kind}X${++tokens}Z`;
  }

  /** The marker words of the changes that a reviewer accepted and that must stay, with the number of accepts. */
  const accepted = new Map<string, number>();
  /** The marker words of the tool calls of each accept of a reviewer. */
  const acceptedOnce = new Set<string>();
  /** The marker words of the tool calls that a reviewer rejected, and that must not be in the document. */
  const rejected = new Set<string>();
  /** The marker words of the tool calls of each reject of a reviewer. */
  const rejectedOnce = new Set<string>();
  const userTokens = new Set<string>();
  /**
   * For a change of a user in a block that has a change of the agent: the
   * marker words of the agent in that block.
   */
  const agentTokensNextTo = new Map<string, string[]>();
  /** The marker word of each tool call of the agent. */
  const tokenOfCall = new Map<string, string>();
  /**
   * The tool calls that changed a block that a different tool call
   * changed. A decision for one such call is a known limit of the two
   * modes: the rules for an accept and a reject of one call do not apply
   * to it.
   */
  const sharesBlock = new Set<string>();
  const callOfToken = new Map<string, string>();

  // ---- The document at the start.
  const count = 4 + random.int(3);
  const sentences = [...SENTENCES].sort(() => random.int(3) - 1);
  const blocks = sentences
    .slice(0, count)
    .map((content, index): PartialBlock =>
      index === 0
        ? { type: "heading", content }
        : index % 3 === 0
          ? { type: "bulletListItem", content }
          : { type: "paragraph", content },
    );

  /** The words that are in the document at the start one time. */
  const startText = sentences.slice(0, count).join(" ");
  const originalWords = (startText.match(/[A-Za-z]{5,}/g) ?? []).filter(
    (word) => startText.split(word).length === 2,
  );

  // ---- The agent: a mock model that makes random tool calls.
  let stepsLeft = 0;
  let calls = 0;
  function agentStep(): ScriptedStep {
    if (stepsLeft === 0) {
      return { text: "Done." };
    }
    stepsLeft--;
    // The users work, and the network moves, while the model writes.
    for (let k = random.int(3); k > 0; k--) {
      if (random.chance(0.5)) {
        userEdit();
      } else {
        world.sync(random.pick(world.clients));
      }
    }
    const current = world.agentText();
    if (current === undefined) {
      throw new Error("The agent did not read the document");
    }
    const toolCallId = `call-${++calls}`;
    const token = nextToken("A");
    tokenOfCall.set(toolCallId, token);
    callOfToken.set(token, toolCallId);
    stats.toolCalls++;
    const reason = `Reason of ${toolCallId}`;
    const unique = (current.markdown.match(/[A-Za-z]{5,}/g) ?? []).filter(
      (word) => current.markdown.split(word).length === 2,
    );
    const kind = random.int(3);
    if (kind < 2 && unique.length > 0) {
      const word = random.pick(unique);
      // The tool calls that changed the block of this word before.
      const block = current.markdown
        .split("\n\n")
        .find((part) => part.includes(word));
      for (const other of agentTokensIn(block ?? "")) {
        const otherCall = callOfToken.get(other);
        if (otherCall !== undefined) {
          sharesBlock.add(otherCall);
          sharesBlock.add(toolCallId);
        }
      }
      log.push(
        `agent ${toolCallId}: ${kind === 0 ? "replace" : "append after"} "${word}" ${token}`,
      );
      return {
        toolCalls: [
          {
            toolName: "editText",
            input: {
              old: word,
              new: kind === 0 ? token : `${word} ${token}`,
              reason,
            },
          },
        ],
      };
    }
    // Sometimes the model writes from an earlier version of its document.
    const earlier = random.chance(0.2)
      ? world.earlierAgentText(random)
      : undefined;
    const base = earlier ?? current;
    const parts = base.markdown.trimEnd().split("\n\n");
    parts.splice(random.int(parts.length + 1), 0, `${token} sentence.`);
    log.push(
      `agent ${toolCallId}: new paragraph ${token}, base ${base.version}`,
    );
    return {
      toolCalls: [
        {
          toolName: "writeDocument",
          input: {
            markdown: `${parts.join("\n\n")}\n`,
            base: base.version,
            reason,
          },
        },
      ],
    };
  }

  const world = createWorld({
    random,
    blocks,
    reviewers: options.reviewers,
    agentStep,
    problem: (problem) => problems.push(problem),
  });
  const { clients, reviewers } = world;

  // ---- The users.
  function userEdit() {
    const editable = clients.filter((client) => world.canEdit(client));
    if (editable.length === 0) {
      return;
    }
    const client = random.pick(editable);
    const block = random.pick(world.blocksForEdit(client));
    const token = nextToken("U");
    userTokens.add(token);
    stats.userEdits++;
    const text = textOf(block);
    const words = text.match(/[A-Za-z]{5,}/g) ?? [];
    const kind = random.int(options.wordConflicts ? 3 : 2);
    if (kind !== 0) {
      agentTokensNextTo.set(token, agentTokensIn(text));
    }
    if (kind === 0) {
      client.editor.insertBlocks(
        [{ type: "paragraph", content: `${token} paragraph.` }],
        block.id,
        "after",
      );
      log.push(`${client.name}: new paragraph ${token}`);
    } else if (kind === 1 || words.length === 0) {
      // Text at the end of the block, as a user types it.
      client.editor.setTextCursorPosition(block.id, "end");
      client.editor.insertInlineContent(` ${token}`);
      log.push(`${client.name}: append ${token} to "${text.slice(0, 40)}"`);
    } else {
      const word = random.pick(words);
      client.editor.updateBlock(block.id, {
        content: text.replace(word, token),
      });
      log.push(`${client.name}: replace "${word}" with ${token}`);
    }
  }

  async function agentRun() {
    stepsLeft = 1 + random.int(3);
    log.push("agent: run");
    await world.runAgent();
  }

  // ---- The reviewers.
  function shows(client: FuzzClient, token: string): boolean {
    return JSON.stringify(client.editor.document).includes(token);
  }

  /**
   * Records an accept of a reviewer for the rules.
   *
   * - The rule for a reject does not apply to a tool call that a reviewer
   *   accepted at some time: the accept wrote its change.
   * - The change of a call must stay in the document if the editor of the
   *   reviewer shows it (an editor does not show a change of the agent
   *   that is in conflict with the main document). For an accept of one
   *   call, the call must also be the only one that changed its blocks.
   */
  function recordAccept(
    client: FuzzClient,
    toolCallIds: readonly string[],
    oneCall: boolean,
  ) {
    stats.accepts++;
    for (const toolCallId of toolCallIds) {
      const token = tokenOfCall.get(toolCallId);
      if (token === undefined) {
        continue;
      }
      acceptedOnce.add(token);
      if (shows(client, token) && !(oneCall && sharesBlock.has(toolCallId))) {
        accepted.set(token, (accepted.get(token) ?? 0) + 1);
      }
    }
  }

  /**
   * Records a reject of a reviewer for the rules. For a reject of one
   * call, the rule applies only if the call is the only one that changed
   * its blocks.
   */
  function recordReject(
    client: FuzzClient,
    toolCallIds: readonly string[],
    oneCall: boolean,
  ) {
    stats.rejects++;
    for (const toolCallId of toolCallIds) {
      const token = tokenOfCall.get(toolCallId);
      if (token === undefined) {
        continue;
      }
      rejectedOnce.add(token);
      if (shows(client, token) && !(oneCall && sharesBlock.has(toolCallId))) {
        rejected.add(token);
      }
    }
  }

  function review(client: FuzzClient, kind = random.pick(REVIEW_KINDS)) {
    if (world.isBusy(client)) {
      return;
    }
    const open = world.openToolCalls(client);
    if (open.length === 0) {
      return;
    }
    const call = random.pick(open);
    if (kind === 0) {
      log.push(`${client.name}: accept all`);
      world.acceptAll(client, () => recordAccept(client, open, false));
    } else if (kind === 1) {
      log.push(`${client.name}: reject all`);
      recordReject(client, open, false);
      world.rejectAll(client);
    } else if (kind === 2) {
      log.push(`${client.name}: accept ${call}`);
      world.acceptToolCall(client, call, () =>
        recordAccept(client, [call], true),
      );
    } else {
      log.push(`${client.name}: reject ${call}`);
      recordReject(client, [call], true);
      world.rejectToolCall(client, call);
    }
  }

  async function refresh(client: FuzzClient) {
    if (!world.isBusy(client)) {
      await world.refresh(client);
    }
  }

  /** Without a delay: all requests arrive, and each reviewer gets the newest state. */
  async function withoutDelay() {
    if (options.delay) {
      return;
    }
    await world.deliverAll();
    for (const reviewer of reviewers) {
      await refresh(reviewer);
    }
  }

  function syncAll() {
    // Two rounds: the second round gives each user the updates that the
    // server got from the other users after it.
    for (let round = 0; round < 2; round++) {
      clients.forEach((client) => world.sync(client));
    }
  }

  /**
   * For the analysis of a problem: with DOCUMENT_AGENT_FUZZ_TRACE set to a
   * marker word, the log has a line after each action that tells where the
   * word is: in the main document (m) and in the editor (e) of each user,
   * and in the main document of the server (s).
   */
  const traced = process.env.DOCUMENT_AGENT_FUZZ_TRACE;
  function trace() {
    if (traced === undefined) {
      return;
    }
    const has = (value: unknown) =>
      JSON.stringify(value).split(traced).length - 1;
    log.push(
      `    ${traced}: ${clients
        .map(
          (client) =>
            `m${has(world.mainOf(client))}e${has(client.editor.document)}`,
        )
        .join(" ")} s${has(world.sharedMain())}`,
    );
  }

  // ---- The scenario.
  try {
    for (let action = 0; action < ACTIONS; action++) {
      trace();
      const kind = random.int(100);
      if (kind < 18) {
        userEdit();
      } else if (kind < 36) {
        world.sync(random.pick(clients));
      } else if (kind < 46) {
        await agentRun();
        await withoutDelay();
      } else if (kind < 66) {
        await refresh(random.pick(reviewers));
      } else if (kind < 88) {
        review(random.pick(reviewers));
        await withoutDelay();
      } else {
        await world.deliver(random.pick(clients));
      }
    }

    // The end: all requests arrive, all editors sync, and the first
    // reviewer accepts what is open.
    await world.deliverAll();
    syncAll();
    for (let attempt = 0; attempt < 6; attempt++) {
      if (await world.reviewEnded()) {
        break;
      }
      await refresh(reviewers[0]);
      review(reviewers[0], 0);
      await world.deliverAll();
      syncAll();
    }
    for (const client of clients) {
      await refresh(client);
    }
    await world.deliverAll();
    syncAll();
    problems.push(...world.problemsAtEnd(), ...problemsOf());
  } catch (error) {
    problems.push({
      rule: error instanceof RuleError ? error.rule : "no-exception",
      detail:
        error instanceof Error
          ? (error.stack ?? String(error)).split("\n").slice(0, 6).join(" | ")
          : String(error),
    });
  }

  /** Examines the rules of the document at the end of a scenario. */
  function problemsOf(): Problem[] {
    const found: Problem[] = [];
    const shared = world.sharedMain();
    const main = JSON.stringify(shared);
    function countOf(token: string) {
      return main.split(token).length - 1;
    }
    // 1. Each user has the main document of the server.
    for (const client of clients) {
      const own = world.mainOf(client);
      if (JSON.stringify(own) !== main) {
        found.push({
          rule: "editors-agree",
          detail: `${client.name}: ${differenceOf(own, shared)}`,
        });
      }
    }
    // 2. No block ID is in the main document two times.
    const ids = shared.map((block) => block.id);
    const twice = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (twice.length > 0) {
      found.push({ rule: "block-ids-different", detail: twice.join(",") });
    }
    // 3. No change of a user is lost, and none is there two times. One
    // loss has its own rule: the text of a user in a block of a tool call
    // that one reviewer accepted and the other reviewer rejected. The block
    // goes, with the text of the user.
    for (const token of userTokens) {
      const times = countOf(token);
      if (times > 1) {
        found.push({ rule: "no-text-twice", detail: `${token} x${times}` });
      } else if (times === 0) {
        const inRejectedBlock = (agentTokensNextTo.get(token) ?? []).some(
          (agentToken) =>
            acceptedOnce.has(agentToken) && rejectedOnce.has(agentToken),
        );
        found.push({
          rule: inRejectedBlock
            ? "user-change-in-rejected-block"
            : "user-change-stays",
          detail: token,
        });
      }
    }
    // No text of the document at the start is there two times.
    for (const word of originalWords) {
      if (countOf(word) > 1) {
        found.push({
          rule: "no-text-twice",
          detail: `"${word}" x${countOf(word)}`,
        });
      }
    }
    // 4. No change of the agent is there two times. An accepted change is
    // there one time, and a rejected change is not there. The last two
    // rules need a scenario without conflicts between a user and the agent.
    // They apply to the decisions that `recordAccept` and `recordReject`
    // record. With two reviewers, the two can make different decisions for
    // one tool call: then each result is permitted.
    const oneDecision = options.reviewers === 1;
    for (const token of tokenOfCall.values()) {
      const times = countOf(token);
      if (times > 1) {
        found.push({ rule: "no-text-twice", detail: `${token} x${times}` });
      } else if (options.wordConflicts) {
        continue;
      } else if (
        accepted.has(token) &&
        times === 0 &&
        (oneDecision || !rejectedOnce.has(token))
      ) {
        found.push({ rule: "accepted-change-stays", detail: token });
      } else if (
        oneDecision &&
        rejected.has(token) &&
        !acceptedOnce.has(token) &&
        times === 1
      ) {
        found.push({ rule: "rejected-change-goes", detail: token });
      }
    }
    return found;
  }

  const result = {
    problems,
    log,
    stats: { ...stats, ...world.stats() },
  };
  world.destroy();
  return result;
}
