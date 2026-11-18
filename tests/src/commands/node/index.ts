// Baseline helpers run directly in Node/jsdom and in browser tests.
export { compareDocuments } from "./compareDocuments.js";
export type {
  BlockLocation,
  DocumentBlock,
  DocumentChange,
  FieldChange,
} from "./compareDocuments.js";
export { selectText } from "./selectText.js";
