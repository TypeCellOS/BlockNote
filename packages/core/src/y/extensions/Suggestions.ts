import { getMarkRange, posToDOMRect } from "@tiptap/core";

import { createExtension } from "../../editor/BlockNoteExtension.js";
import { ySyncPluginKey } from "@y/prosemirror";

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
    runsBefore: ["ySync"],
    showSuggestions: () => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.setSuggestionMode("view");
    },
    enableSuggestions: () => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.setSuggestionMode("edit");
    },
    disableSuggestions: () => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.setSuggestionMode("off");
    },
    applySuggestion: (start: number, end?: number) => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.acceptChanges(start, end);
    },
    revertSuggestion: (start: number, end?: number) => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.rejectChanges(start, end);
    },
    applyAllSuggestions: () => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.acceptAllChanges();
    },
    revertAllSuggestions: () => {
      const pluginState = ySyncPluginKey.getState(editor.prosemirrorState);
      if (!pluginState) {
        throw new Error("ySync plugin state not found");
      }
      pluginState.rejectAllChanges();
    },

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
