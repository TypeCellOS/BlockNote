import { Block, BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../streamTool/streamTool.js";
import { DocumentStateBuilder } from "../formats/DocumentStateBuilder.js";

/**
 * An AIRequest represents a user request for an editor AI call
 */
export type AIRequest = {
  /**
   * The editor from which we can read document state
   */
  editor: BlockNoteEditor<any, any, any>;

  /**
   * The selection of the editor which the LLM should operate on
   */
  selectedBlocks?: Block<any, any, any>[];

  /**
   * The id of the block that should be excluded from the LLM call,
   * this is used when using the AI slash menu in an empty block
   */
  emptyCursorBlockToDelete?: string;

  /**
   * The stream tools that can be used by the LLM
   */
  streamTools: StreamTool<any>[];

  /**
   * The document state to pass to the LLM call
   */
  documentState: Awaited<ReturnType<DocumentStateBuilder<any>>>;

  /**
   * The function to call when AI tool call streaming starts
   */
  onStart: () => void;
};
