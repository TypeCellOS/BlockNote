import { MigrationRule, PreSyncMigrationRule } from "./migrationRule.js";
import { moveColorAttributes } from "./moveColorAttributes.js";
import { stripDisallowedMarks } from "./stripDisallowedMarks.js";

// Rules that run AFTER y-prosemirror reconstructs the document (via a tr).
export const migrationRules = [moveColorAttributes] as MigrationRule[];

// Rules that run BEFORE y-prosemirror reconstructs the document (mutating the
// Yjs fragment directly).
export const preSyncMigrationRules = [
  stripDisallowedMarks,
] as PreSyncMigrationRule[];

export default migrationRules;
