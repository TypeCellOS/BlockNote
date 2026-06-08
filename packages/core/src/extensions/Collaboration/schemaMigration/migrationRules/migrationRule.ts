import { Transaction } from "@tiptap/pm/state";
import * as Y from "@y/y";

export type MigrationRule = (fragment: Y.Type, tr: Transaction) => void;
