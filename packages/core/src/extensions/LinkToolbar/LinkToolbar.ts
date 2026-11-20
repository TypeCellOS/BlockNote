import { posToDOMRect } from "@tiptap/core";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { isAllowedUri } from "../tiptap-extensions/Link/link.js";
import { normalizeLinkUrl } from "./protocols.js";

export const LinkToolbarExtension = createExtension(({ editor, options }) => {
  const isValidLink: (href: string) => boolean =
    options?.links?.isValidLink ?? isAllowedUri;

  function getLinkElementAtPos(pos: number) {
    let currentNode = editor.prosemirrorView.nodeDOM(pos);
    while (currentNode && currentNode.parentElement) {
      if (currentNode.nodeName === "A") {
        return currentNode as HTMLAnchorElement;
      }
      currentNode = currentNode.parentElement;
    }
    return null;
  }

  function getLinkAtPos(pos: number) {
    const linkData = editor.getLinkMarkAtPos(pos);
    if (!linkData) {
      return undefined;
    }

    return {
      range: { from: linkData.from, to: linkData.to },
      // Expose mark-like attrs for backward compat with React LinkToolbarController
      mark: { attrs: { href: linkData.href } },
      get text() {
        return linkData.text;
      },
      get position() {
        return posToDOMRect(
          editor.prosemirrorView,
          linkData.from,
          linkData.to,
        ).toJSON() as DOMRect;
      },
    };
  }

  function getLinkAtSelection() {
    return editor.transact((tr) => {
      if (!tr.selection.empty) {
        return undefined;
      }
      return getLinkAtPos(tr.selection.anchor);
    });
  }

  return {
    key: "linkToolbar",

    getLinkAtSelection,
    getLinkElementAtPos,
    getMarkAtPos(pos: number, _markType: string) {
      return getLinkAtPos(pos);
    },

    getLinkAtElement(element: HTMLElement) {
      return editor.transact(() => {
        const posAtElement = editor.prosemirrorView.posAtDOM(element, 0) + 1;
        return getLinkAtPos(posAtElement);
      });
    },

    /**
     * Prepares a URL entered in the link toolbar, prepending the default
     * protocol unless the URL already has one the editor accepts.
     */
    normalizeUrl(url: string) {
      return normalizeLinkUrl(url, isValidLink);
    },

    editLink(
      url: string,
      text: string,
      position = editor.transact((tr) => tr.selection.anchor),
    ) {
      editor.editLink(url, text, position);
    },

    deleteLink(position = editor.transact((tr) => tr.selection.anchor)) {
      editor.deleteLink(position);
    },
  } as const;
});
