import { getMarkRange, posToDOMRect } from "@tiptap/core";

import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import {
  acceptChanges,
  rejectAllChanges,
  rejectChanges,
  configureYProsemirror,
  acceptAllChanges,
} from "@y/prosemirror";
import { CollaborationOptions } from "./index.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { normalizeToUserStore } from "../../user/index.js";

export const SuggestionsExtension = createExtension(
  ({ editor, options }: ExtensionOptions<CollaborationOptions>) => {
    const suggestionDoc = options.suggestionDoc;
    if (!suggestionDoc) {
      throw new Error("Suggestion doc not found");
    }
    // Shared with the rest of collaboration; the collaboration extension passes
    // an already-built store here.
    const userStore = normalizeToUserStore(options.resolveUsers);

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
      userStore,
      runsBefore: ["ySync"],
      viewSuggestions: () => {
        if (options.renderer) {
          options.renderer.suggestionMode = false;
        }
        editor.exec(
          configureYProsemirror({
            ytype: findTypeInOtherYdoc(options.fragment, suggestionDoc),
            renderer: options.renderer,
          }),
        );
      },
      enableSuggestions: () => {
        if (options.renderer) {
          options.renderer.suggestionMode = true;
        }
        editor.exec(
          configureYProsemirror({
            ytype: findTypeInOtherYdoc(options.fragment, suggestionDoc),
            renderer: options.renderer,
          }),
        );
      },
      disableSuggestions: () => {
        editor.exec(
          configureYProsemirror({
            ytype: options.fragment,
            renderer: null,
          }),
        );
      },
      applyAllSuggestions: () => {
        return editor.exec(acceptAllChanges());
      },
      applySuggestion: (start: number, end?: number) => {
        return editor.exec(acceptChanges(start, end));
      },
      revertSuggestion: (start: number, end?: number) => {
        return editor.exec(rejectChanges(start, end));
      },
      revertAllSuggestions: () => {
        return editor.exec(rejectAllChanges());
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
            getMarkAtPos(posAtCoords.pos, "y-attributed-insert") ||
            getMarkAtPos(posAtCoords.pos, "y-attributed-delete") ||
            getMarkAtPos(posAtCoords.pos, "y-attributed-format")
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
                mark.type.name === "y-attributed-insert" ||
                mark.type.name === "y-attributed-delete" ||
                mark.type.name === "y-attributed-format",
            ) !== -1;

          return true;
        });

        return hasUnresolvedSuggestions;
      },
    } as const;
  },
);
