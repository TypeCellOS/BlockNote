import { Transaction } from "@tiptap/pm/state";
import * as Y from "yjs";

export type MigrationRule = (fragment: Y.XmlFragment, tr: Transaction) => void;
