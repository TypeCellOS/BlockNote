import type { Proposal } from "../proposal/types.js";

/**
 * Keeps the proposals. A host keeps no document in its memory between two
 * tool calls: each call loads the proposal, makes a new headless editor,
 * and saves the proposal with the new batch.
 *
 * A production store is a database. It must refuse a save that does not
 * follow the stored proposal (a compare and swap on the number of batches):
 * two hosts can run tool calls for one proposal.
 */
export type ProposalStore = {
  load(id: string): Promise<Proposal | undefined>;
  save(id: string, proposal: Proposal): Promise<void>;
};

/** A proposal store in memory, with a listener for each change. */
export type InMemoryProposalStore = ProposalStore & {
  /** The IDs of all proposals. */
  ids(): string[];
  /** Calls the listener after each save. Returns the function that stops it. */
  subscribe(listener: (id: string, proposal: Proposal) => void): () => void;
};

/**
 * A proposal store in memory. It is sufficient for one request (a run that
 * a user starts sends the proposal with each request), for tests, and for a
 * demo server.
 */
export function createInMemoryProposalStore(): InMemoryProposalStore {
  const proposals = new Map<string, Proposal>();
  const listeners = new Set<(id: string, proposal: Proposal) => void>();
  return {
    async load(id) {
      return proposals.get(id);
    },
    async save(id, proposal) {
      proposals.set(id, proposal);
      for (const listener of listeners) {
        listener(id, proposal);
      }
    },
    ids() {
      return [...proposals.keys()];
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
