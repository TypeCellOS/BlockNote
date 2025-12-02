"use client";
// exports that are safe to use on server
// for now, this is everything except
// React components, hooks and AIExtension (because it uses @ai-sdk/react)
// that might be client-only

export * from "./api/index.js";
export * from "./blocknoteAIClient/client.js";
export * from "./i18n/dictionary.js";
export { getApplySuggestionsTr as _getApplySuggestionsTr } from "./prosemirror/rebaseTool.js";
export * from "./streamTool/index.js";
