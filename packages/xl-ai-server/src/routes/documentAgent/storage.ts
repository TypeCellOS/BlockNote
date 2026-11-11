import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Where this demo server keeps the state of the document agent.
//
// Without `DOCUMENT_AGENT_DATA_DIR`, the state is in the memory of the
// process: a restart of the server loses it. With it, the state is in files
// in that directory (see `fileStores.ts`): the chats, the proposals, the
// documents, the streams of the runs, and the Y.Docs of the two Yjs relays.

const configured = process.env.DOCUMENT_AGENT_DATA_DIR;

/** The directory of the state, or `undefined` if the state is in memory. */
export const dataDirectory =
  configured === undefined || configured === ""
    ? undefined
    : resolve(configured);

/**
 * The folder for one kind of state in the data directory, or `undefined`
 * if the state is in memory.
 */
export function dataFolder(...names: string[]): string | undefined {
  if (dataDirectory === undefined) {
    return undefined;
  }
  const folder = join(dataDirectory, ...names);
  mkdirSync(folder, { recursive: true });
  return folder;
}
