import type { PasteRuleMatch } from "@tiptap/core";
import { Mark, markPasteRule, mergeAttributes } from "@tiptap/core";
import type { Plugin } from "@tiptap/pm/state";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { autolink } from "./helpers/autolink.js";
import { findLinks } from "./helpers/linkDetector.js";
import { clickHandler } from "./helpers/clickHandler.js";
import { pasteHandler } from "./helpers/pasteHandler.js";
import { UNICODE_WHITESPACE_REGEX_GLOBAL } from "./helpers/whitespace.js";

const DEFAULT_PROTOCOL = "https";

const HTML_ATTRIBUTES = {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
  className: "bn-inline-content-section",
  "data-inline-content-type": "link",
};

// Pre-compiled regex for URI protocol validation.
// Allows: http, https, ftp, ftps, mailto, tel, callto, sms, cid, xmpp
const ALLOWED_URI_REGEX =
  // eslint-disable-next-line no-useless-escape
  /^(?:(?:http|https|ftp|ftps|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))/i;

export function isAllowedUri(uri: string | undefined): boolean {
  if (!uri) {
    return true;
  }
  const cleaned = uri.replace(UNICODE_WHITESPACE_REGEX_GLOBAL, "");
  return ALLOWED_URI_REGEX.test(cleaned);
}

/**
 * Determine whether a detected URL should be auto-linked.
 * URLs with explicit protocols are always auto-linked.
 * Bare hostnames must have a TLD (no IP addresses or single words).
 */
function shouldAutoLink(url: string): boolean {
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
  const hasMaybeProtocol = /^[a-z][a-z0-9+.-]*:/i.test(url);

  if (hasProtocol || (hasMaybeProtocol && !url.includes("@"))) {
    return true;
  }
  // Strip userinfo (user:pass@) if present, then extract hostname
  const urlWithoutUserinfo = url.includes("@") ? url.split("@").pop()! : url;
  const hostname = urlWithoutUserinfo.split(/[/?#:]/)[0];

  // Don't auto-link IP addresses without protocol
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }
  // Don't auto-link single-word hostnames without TLD (e.g., "localhost")
  if (!/\./.test(hostname)) {
    return false;
  }
  return true;
}

export type LinkOptions = {
  HTMLAttributes: Record<string, any>;
  editor?: BlockNoteEditor<any, any, any>;
  onClick?: (
    event: MouseEvent,
    editor: BlockNoteEditor<any, any, any>,
  ) => boolean | void;
  isValidLink: (href: string) => boolean;
};

/**
 * BlockNote Link mark extension.
 */
export const Link = Mark.create<LinkOptions>({
  name: "link",

  priority: 1000,

  keepOnSplit: false,

  exitable: true,

  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      editor: undefined,
      onClick: undefined,
      isValidLink: isAllowedUri,
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML(element) {
          return element.getAttribute("href");
        },
      },
      target: {
        default: HTML_ATTRIBUTES.target,
      },
      rel: {
        default: HTML_ATTRIBUTES.rel,
      },
    };
  },

  parseHTML() {
    const isValidLink = this.options.isValidLink;
    return [
      {
        tag: "a[href]",
        getAttrs: (dom) => {
          const href = (dom as HTMLElement).getAttribute("href");
          if (!href || !isValidLink(href)) {
            return false;
          }
          return null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    if (!this.options.isValidLink(HTMLAttributes.href)) {
      return [
        "a",
        mergeAttributes(HTML_ATTRIBUTES, { ...HTMLAttributes, href: "" }),
        0,
      ];
    }

    return ["a", mergeAttributes(HTML_ATTRIBUTES, HTMLAttributes), 0];
  },

  addPasteRules() {
    const isValidLink = this.options.isValidLink;
    return [
      markPasteRule({
        find: (text) => {
          const foundLinks: PasteRuleMatch[] = [];

          if (text) {
            const links = findLinks(text, {
              defaultProtocol: DEFAULT_PROTOCOL,
            }).filter((item) => item.isLink && isValidLink(item.value));

            for (const link of links) {
              if (!shouldAutoLink(link.value)) {
                continue;
              }

              foundLinks.push({
                text: link.value,
                data: { href: link.href },
                index: link.start,
              });
            }
          }

          return foundLinks;
        },
        type: this.type,
        getAttributes: (match) => ({
          href: match.data?.href,
        }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    const plugins: Plugin[] = [];

    plugins.push(
      autolink({
        type: this.type,
        defaultProtocol: DEFAULT_PROTOCOL,
        validate: this.options.isValidLink,
        shouldAutoLink,
      }),
    );

    plugins.push(
      clickHandler({
        type: this.type,
        tiptapEditor: this.editor,
        editor: this.options.editor,
        onClick: this.options.onClick,
      }),
    );

    plugins.push(
      pasteHandler({
        editor: this.editor,
        defaultProtocol: DEFAULT_PROTOCOL,
        type: this.type,
        shouldAutoLink,
        isValidLink: this.options.isValidLink,
      }),
    );

    return plugins;
  },
});
