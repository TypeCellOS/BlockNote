import type { NodeWithPos } from "@tiptap/core";
import {
  combineTransactionSteps,
  findChildrenInRange,
  getChangedRanges,
  getMarksBetween,
} from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { LinkMatch } from "./linkDetector.js";
import { tokenizeLink } from "./linkDetector.js";

import {
  UNICODE_WHITESPACE_REGEX,
  UNICODE_WHITESPACE_REGEX_END,
} from "./whitespace.js";

/**
 * Check if the provided tokens form a valid link structure, which can either be a single link token
 * or a link token surrounded by parentheses or square brackets.
 */
function isValidLinkStructure(tokens: LinkMatch[]) {
  if (tokens.length === 1) {
    return tokens[0].isLink;
  }

  if (tokens.length === 3 && tokens[1].isLink) {
    return ["()", "[]"].includes(tokens[0].value + tokens[2].value);
  }

  return false;
}

type AutolinkOptions = {
  type: MarkType;
  defaultProtocol: string;
  validate: (url: string) => boolean;
  shouldAutoLink: (url: string) => boolean;
};

/**
 * Plugin that automatically adds link marks when typing URLs.
 */
export function autolink(options: AutolinkOptions): Plugin {
  return new Plugin({
    key: new PluginKey("autolink"),
    appendTransaction: (transactions, oldState, newState) => {
      const docChanges =
        transactions.some((transaction) => transaction.docChanged) &&
        !oldState.doc.eq(newState.doc);

      const preventAutolink = transactions.some((transaction) =>
        transaction.getMeta("preventAutolink")
      );

      if (!docChanges || preventAutolink) {
        return;
      }

      const { tr } = newState;
      const transform = combineTransactionSteps(oldState.doc, [
        ...transactions,
      ]);
      const changes = getChangedRanges(transform);

      changes.forEach(({ newRange }) => {
        const nodesInChangedRanges = findChildrenInRange(
          newState.doc,
          newRange,
          (node) => node.isTextblock
        );

        let textBlock: NodeWithPos | undefined;
        let textBeforeWhitespace: string | undefined;

        if (nodesInChangedRanges.length > 1) {
          textBlock = nodesInChangedRanges[0];
          textBeforeWhitespace = newState.doc.textBetween(
            textBlock.pos,
            textBlock.pos + textBlock.node.nodeSize,
            undefined,
            " "
          );
        } else if (nodesInChangedRanges.length) {
          const endText = newState.doc.textBetween(
            newRange.from,
            newRange.to,
            " ",
            " "
          );
          if (!UNICODE_WHITESPACE_REGEX_END.test(endText)) {
            return;
          }
          textBlock = nodesInChangedRanges[0];
          textBeforeWhitespace = newState.doc.textBetween(
            textBlock.pos,
            newRange.to,
            undefined,
            " "
          );
        }

        if (textBlock && textBeforeWhitespace) {
          const wordsBeforeWhitespace = textBeforeWhitespace
            .split(UNICODE_WHITESPACE_REGEX)
            .filter(Boolean);

          if (wordsBeforeWhitespace.length <= 0) {
            return;
          }

          const lastWordBeforeSpace =
            wordsBeforeWhitespace[wordsBeforeWhitespace.length - 1];
          const lastWordAndBlockOffset =
            textBlock.pos +
            textBeforeWhitespace.lastIndexOf(lastWordBeforeSpace);

          if (!lastWordBeforeSpace) {
            return;
          }

          const linksBeforeSpace = tokenizeLink(
            lastWordBeforeSpace,
            options.defaultProtocol
          );

          if (!isValidLinkStructure(linksBeforeSpace)) {
            return;
          }

          linksBeforeSpace
            .filter((link) => link.isLink)
            .map((link) => ({
              ...link,
              from: lastWordAndBlockOffset + link.start + 1,
              to: lastWordAndBlockOffset + link.end + 1,
            }))
            // ignore link inside code mark
            .filter((link) => {
              if (!newState.schema.marks.code) {
                return true;
              }

              return !newState.doc.rangeHasMark(
                link.from,
                link.to,
                newState.schema.marks.code
              );
            })
            .filter((link) => options.validate(link.value))
            .filter((link) => options.shouldAutoLink(link.value))
            .forEach((link) => {
              if (
                getMarksBetween(link.from, link.to, newState.doc).some(
                  (item) => item.mark.type === options.type
                )
              ) {
                return;
              }

              tr.addMark(
                link.from,
                link.to,
                options.type.create({
                  href: link.href,
                })
              );
            });
        }
      });

      if (!tr.steps.length) {
        return;
      }

      return tr;
    },
  });
}
