import { Transaction } from "@tiptap/pm/state";
import * as Y from "yjs";

import { BlockSchema } from "../../../../schema/index.js";

// Runs AFTER y-prosemirror has reconstructed the document, repairing it via a
// ProseMirror transaction. Suitable for schema changes where the node survives
// reconstruction (e.g. an attribute moved to a different node).
export type MigrationRule = (fragment: Y.XmlFragment, tr: Transaction) => void;

// Runs BEFORE y-prosemirror reconstructs the document, mutating the Yjs
// fragment directly. Needed for schema changes where invalid content would make
// y-prosemirror reject (and delete) a node during reconstruction — those must
// be fixed on the fragment first, so there is no ProseMirror transaction yet.
export type PreSyncMigrationRule = (
  fragment: Y.XmlFragment,
  blockSchema: BlockSchema,
) => void;
