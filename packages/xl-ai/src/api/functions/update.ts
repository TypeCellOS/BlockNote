import { BlockNoteEditor } from "@blocknote/core";
import { DeepPartial } from "ai";
import { InvalidOrOk, UpdateBlocksOperation } from "./blocknoteFunctions.js";
import { LLMFunction } from "./function.js";

export abstract class UpdateFunctionBase<T> extends LLMFunction<
  UpdateBlocksOperation<T>
> {
  public schema = {
    name: "update",
    description:
      "Update a block, the new block will replace the existing block.",
    parameters: {
      id: {
        type: "string",
        description: "id of block to update",
      },
      block: {
        $ref: "#/$defs/block",
        // type: "object",
        // properties: {},
      },
    },
    required: ["id", "block"],
  } as const;

  protected abstract validateBlock(
    block: any,
    editor: BlockNoteEditor<any, any, any>,
    fallbackType?: string
  ): InvalidOrOk<T>;

  public validate(
    operation: DeepPartial<UpdateBlocksOperation<T>>,
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
    }
  ): InvalidOrOk<UpdateBlocksOperation<T>> {
    if (operation.type !== this.schema.name) {
      return {
        result: "invalid",
        reason: "invalid operation type",
      };
    }

    if (!operation.id) {
      return {
        result: "invalid",
        reason: "id is required",
      };
    }

    let id = operation.id;
    if (options.idsSuffixed) {
      if (!id?.endsWith("$")) {
        return {
          result: "invalid",
          reason: "id must end with $",
        };
      }

      id = id.slice(0, -1);
    }

    if (!operation.block) {
      return {
        result: "invalid",
        reason: "block is required",
      };
    }

    const block = editor.getBlock(id);

    if (!block) {
      // eslint-disable-next-line no-console
      console.error("BLOCK NOT FOUND", id);
      return {
        result: "invalid",
        reason: "block not found",
      };
    }

    const ret = this.validateBlock(operation.block, editor, block.type);

    if (ret.result === "invalid") {
      return ret;
    }

    return {
      result: "ok",
      value: {
        type: operation.type,
        id,
        block: ret.value,
      },
    };
  }
}
