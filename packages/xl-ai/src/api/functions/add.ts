import { BlockNoteEditor } from "@blocknote/core";
import { InsertBlocksOperation, InvalidOrOk } from "./blocknoteFunctions.js";
import { LLMFunction } from "./function.js";

export abstract class AddFunctionBase<T> extends LLMFunction<
  InsertBlocksOperation<T>
> {
  public schema = {
    name: "add",
    description: "Insert new blocks",
    parameters: {
      referenceId: {
        type: "string",
        description: "",
      },
      position: {
        type: "string",
        enum: ["before", "after"],
        description:
          "Whether new block(s) should be inserted before or after `referenceId`",
      },
      blocks: {
        items: {
          $ref: "#/$defs/block",
          // type: "object",
          // properties: {},
        },
        type: "array",
      },
    },
    required: ["referenceId", "position", "blocks"],
  } as const;

  protected abstract validateBlock(
    block: any,
    editor: BlockNoteEditor<any, any, any>
  ): InvalidOrOk<T>;

  public validate(
    operation: any,
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
    }
  ): InvalidOrOk<InsertBlocksOperation<T>> {
    if (operation.type !== this.schema.name) {
      return {
        result: "invalid",
        reason: "invalid operation type",
      };
    }

    if (operation.position !== "before" && operation.position !== "after") {
      return {
        result: "invalid",
        reason: "invalid position",
      };
    }

    let referenceId = operation.referenceId;
    if (options.idsSuffixed) {
      if (!referenceId?.endsWith("$")) {
        return {
          result: "invalid",
          reason: "referenceId must end with $",
        };
      }

      referenceId = referenceId.slice(0, -1);
    }

    const block = editor.getBlock(referenceId);

    if (!block) {
      return {
        result: "invalid",
        reason: "referenceId not found",
      };
    }

    if (!operation.blocks || operation.blocks.length === 0) {
      return {
        result: "invalid",
        reason: "blocks is required",
      };
    }

    const ret = (operation.blocks as []).every(
      (block: any) => this.validateBlock(block, editor).result === "ok"
    );

    if (!ret) {
      return {
        result: "invalid",
        reason: "invalid block",
      };
    }

    return {
      result: "ok",
      value: {
        type: operation.type,
        referenceId,
        position: operation.position,
        blocks: operation.blocks,
      },
    };
  }
}
