import {
  applySuggestion,
  applySuggestions,
  disableSuggestChanges,
  enableSuggestChanges,
  revertSuggestion,
  revertSuggestions,
  suggestChanges,
  withSuggestChanges,
} from "@handlewithcare/prosemirror-suggest-changes";
import { getMarkRange, posToDOMRect } from "@tiptap/core";

import { createExtension } from "../../editor/BlockNoteExtension.js";

export const SuggestionsExtension = createExtension(({ editor }) => {
  function getSuggestionElementAtPos(pos: number) {
    let currentNode = editor.prosemirrorView.nodeDOM(pos);
    while (currentNode && currentNode.parentElement) {
      if (currentNode.nodeName === "INS" || currentNode.nodeName === "DEL") {
        return currentNode as HTMLElement;
      }
      currentNode = currentNode.parentElement;
    }
    return null;
  }

  function getMarkAtPos(pos: number, markType: string) {
    return editor.transact((tr) => {
      const resolvedPos = tr.doc.resolve(pos);
      const mark = resolvedPos
        .marks()
        .find((mark) => mark.type.name === markType);

      if (!mark) {
        return;
      }

      const markRange = getMarkRange(resolvedPos, mark.type);
      if (!markRange) {
        return;
      }

      return {
        range: markRange,
        mark,
        get text() {
          return tr.doc.textBetween(markRange.from, markRange.to);
        },
        get position() {
          // to minimize re-renders, we convert to JSON, which is the same shape anyway
          return posToDOMRect(
            editor.prosemirrorView,
            markRange.from,
            markRange.to,
          ).toJSON() as DOMRect;
        },
      };
    });
  }

  function getSuggestionAtSelection() {
    return editor.transact((tr) => {
      const selection = tr.selection;
      if (!selection.empty) {
        return undefined;
      }
      return (
        getMarkAtPos(selection.anchor, "insertion") ||
        getMarkAtPos(selection.anchor, "deletion") ||
        getMarkAtPos(selection.anchor, "modification")
      );
    });
  }

  return {
    key: "suggestions",
    prosemirrorPlugins: [suggestChanges()],
    // mount: () => {
    //   const origDispatchTransaction = (
    //     editor._tiptapEditor as any
    //   ).dispatchTransaction.bind(editor._tiptapEditor);

    //   (editor._tiptapEditor as any).dispatchTransaction = withSuggestChanges(
    //     origDispatchTransaction,
    //   );
    // },
    enableSuggestions: () =>
      enableSuggestChanges(
        editor.prosemirrorState,
        (editor._tiptapEditor as any).dispatchTransaction.bind(
          editor._tiptapEditor,
        ),
      ),
    disableSuggestions: () =>
      disableSuggestChanges(
        editor.prosemirrorState,
        (editor._tiptapEditor as any).dispatchTransaction.bind(
          editor._tiptapEditor,
        ),
      ),
    applySuggestion: (id: string) =>
      applySuggestion(id)(
        editor.prosemirrorState,
        withSuggestChanges(editor.prosemirrorView.dispatch).bind(
          editor._tiptapEditor,
        ),
        editor.prosemirrorView,
      ),
    revertSuggestion: (id: string) =>
      revertSuggestion(id)(
        editor.prosemirrorState,
        withSuggestChanges(editor.prosemirrorView.dispatch).bind(
          editor._tiptapEditor,
        ),
        editor.prosemirrorView,
      ),
    applyAllSuggestions: () =>
      applySuggestions(
        editor.prosemirrorState,
        withSuggestChanges(editor.prosemirrorView.dispatch).bind(
          editor._tiptapEditor,
        ),
      ),
    revertAllSuggestions: () =>
      revertSuggestions(
        editor.prosemirrorState,
        withSuggestChanges(editor.prosemirrorView.dispatch).bind(
          editor._tiptapEditor,
        ),
      ),

    getSuggestionElementAtPos,
    getMarkAtPos,
    getSuggestionAtSelection,
    getSuggestionAtCoords: (coords: { left: number; top: number }) => {
      return editor.transact(() => {
        const posAtCoords = editor.prosemirrorView.posAtCoords(coords);
        if (posAtCoords === null || posAtCoords?.inside === -1) {
          return undefined;
        }

        return (
          getMarkAtPos(posAtCoords.pos, "insertion") ||
          getMarkAtPos(posAtCoords.pos, "deletion") ||
          getMarkAtPos(posAtCoords.pos, "modification")
        );
      });
    },
    checkUnresolvedSuggestions: () => {
      let hasUnresolvedSuggestions = false;

      editor.prosemirrorState.doc.descendants((node) => {
        if (hasUnresolvedSuggestions) {
          return false;
        }

        hasUnresolvedSuggestions =
          node.marks.findIndex(
            (mark) =>
              mark.type.name === "insertion" ||
              mark.type.name === "deletion" ||
              mark.type.name === "modification",
          ) !== -1;

        return true;
      });

      return hasUnresolvedSuggestions;
    },
  } as const;
});
