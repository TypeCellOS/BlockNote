import {
  BlockNoteEditor,
  blockToNode,
  getBlockInfo,
  getNodeById,
  trackPosition,
} from "@blocknote/core";
import { Fragment, Slice } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import {
  applyAgentStep,
  delayAgentStep,
  getStepsAsAgent,
} from "../../../../prosemirror/agent.js";
import { trToReplaceSteps } from "../../../../prosemirror/changeset.js";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";
import { streamTool } from "../../../../streamTool/streamTool.js";
import { AbortError } from "../../../../util/AbortError.js";
import { getPartialHTML } from "../../html-blocks/tools/getPartialHTML.js";
import { exportHtmlDocument } from "../htmlDocument.js";

type FileReplaceToolCall = {
  type: "file_replace";
  target: string;
  replacement: string;
};

type BlockRange = {
  start: number;
  end: number;
};

// Placeholder for now
export const replaceTool = (
  editor: BlockNoteEditor<any, any, any>,
  options: {
    idsSuffixed: boolean;
    withDelays: boolean;
    updateSelection?: {
      from: number;
      to: number;
    };
    onBlockUpdate?: (blockId: string) => void;
  },
) => {
  // We use streamTool directly as requested
  return streamTool<FileReplaceToolCall>({
    name: "file_replace",
    description: "Replace a part of the document file",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The string to replace",
        },
        replacement: {
          type: "string",
          description: "The replacement string",
        },
      },
      required: ["target", "replacement"],
    },
    validate: (operation: any) => {
      if (!operation.target?.length || !operation.replacement?.length) {
        return { ok: false, error: "Missing target or replacement" };
      }
      return { ok: true, value: operation as FileReplaceToolCall };
    },
    executor: async () => {
      const STEP_SIZE = 50;
      let minSize = STEP_SIZE;
      const selectionPositions = options.updateSelection
        ? {
            from: trackPosition(editor, options.updateSelection.from),
            to: trackPosition(editor, options.updateSelection.to),
          }
        : undefined;

      // TODO: init here or pass in?
      const { blockRanges, document } = await exportHtmlDocument(editor);

      let startPos: number | undefined;
      let endPos: number | undefined;

      return {
        execute: async (chunk, abortSignal) => {
          if (chunk.operation.type !== "file_replace") {
            return false;
          }

          const operation = chunk.operation as FileReplaceToolCall;

          // TODO: apply suggestions?

          const start = document.indexOf(operation.target);

          if (start === -1) {
            return true; // TODO?
          }

          const end = start + operation.target.length;

          const allAffected: string[] = [];
          for (const [id, range] of blockRanges) {
            if (range.start < end && range.end > start) {
              allAffected.push(id);
            }
          }
          allAffected.sort(
            (a, b) => blockRanges.get(a)!.start - blockRanges.get(b)!.start,
          );

          const startBlock = allAffected[0];
          const endBlock = allAffected[allAffected.length - 1];

          const extraPrefix = document.substring(
            blockRanges.get(startBlock)!.start,
            start,
          );
          const extraSuffix = document.substring(
            end,
            blockRanges.get(endBlock)!.end,
          );

          const replacement =
            extraPrefix +
            operation.replacement +
            (chunk.isPossiblyPartial ? "" : extraSuffix);

          // TODO: might not be entire block
          const parsedHtml = chunk.isPossiblyPartial
            ? getPartialHTML(replacement)
            : replacement;

          if (!parsedHtml) {
            // TODO
            return true;
          }

          const blocks = await editor.tryParseHTMLToBlocks(parsedHtml);
          // Placeholder: logic to map to block updates will be added later
          const nodes = blocks.map((block) =>
            blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
          );
          const fragment = Fragment.fromArray(nodes);

          const slice = new Slice(fragment, 0, 0);

          // REC: we could investigate whether we can use a single rebasetool across operations instead of
          // creating a new one every time (possibly expensive)
          const tool = rebaseTool(editor, getApplySuggestionsTr(editor));

          const replaceTr = new Transform(tool.doc);

          if (startPos === undefined || endPos === undefined) {
            const startNode = getNodeById(startBlock, tool.doc)!;
            const endNode = getNodeById(endBlock, tool.doc)!;

            // TODO: when an error happens here, unit test doesn't crash?

            startPos = startNode.posBeforeNode;
            endPos = getBlockInfo(endNode).bnBlock.afterPos;
          }

          replaceTr.replaceRange(startPos, endPos, slice);

          startPos = replaceTr.mapping.map(startPos);
          endPos = replaceTr.mapping.map(endPos);

          // const slice2 = tool.doc.slice(
          //   startNode.posBeforeNode,
          //   getBlockInfo(endNode).bnBlock.afterPos,
          // );
          debugger;
          const steps = trToReplaceSteps(
            replaceTr,
            tool.doc,
            chunk.isPossiblyPartial,
          );

          const inverted = steps.map((step) => step.map(tool.invertMap)!);

          const tr = new Transform(editor.prosemirrorState.doc);
          for (const step of inverted) {
            tr.step(step.map(tr.mapping)!);
          }
          const agentSteps = getStepsAsAgent(tr);

          for (const step of agentSteps) {
            if (abortSignal?.aborted) {
              throw new AbortError("Operation was aborted");
            }
            if (options.withDelays) {
              await delayAgentStep(step);
            }
            editor.transact((tr) => {
              applyAgentStep(tr, step);
            });
            // options.onBlockUpdate?.(operation.id);
          }
          return true;
        },
      };
    },
  });
};
