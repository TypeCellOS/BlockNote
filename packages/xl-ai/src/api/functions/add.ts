import { BlockNoteEditor } from "@blocknote/core";
import { DeepPartial } from "ai";
import { InsertBlocksOperation, InvalidOrOk } from "./blocknoteFunctions.js";
import { LLMFunction } from "./function.js";
import { validateArray } from "./util/validateArray.js";

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
    operation: DeepPartial<InsertBlocksOperation<T>>,
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

    if (!operation.referenceId || !operation.blocks) {
      return {
        result: "invalid",
        reason: "referenceId and blocks are required",
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

    const validatedBlocksResult = validateArray<T>(operation.blocks, (block) =>
      this.validateBlock(block, editor)
    );

    if (validatedBlocksResult.result === "invalid") {
      return validatedBlocksResult;
    }

    return {
      result: "ok",
      value: {
        type: operation.type,
        referenceId,
        position: operation.position,
        blocks: validatedBlocksResult.value,
      },
    };
  }
}
