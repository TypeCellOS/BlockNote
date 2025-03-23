import { BlockNoteEditor } from "@blocknote/core";
import { DeepPartial } from "ai";
import { InvalidOrOk, RemoveBlocksOperation } from "./blocknoteFunctions.js";
import { LLMFunction } from "./function.js";

type DeleteFunctionInput = Omit<RemoveBlocksOperation, "ids"> & {
  id: string;
};

// TODO, rename to remove?
export class DeleteFunction extends LLMFunction<RemoveBlocksOperation> {
  public schema = {
    name: "delete",
    description: "Delete a block",
    parameters: {
      id: {
        type: "string",
        description: "id of block to delete",
      },
    },
    required: ["id"],
  } as const;

  validate(
    operation: DeepPartial<DeleteFunctionInput>,
    editor: BlockNoteEditor,
    options: {
      idsSuffixed: boolean;
    }
  ): InvalidOrOk<RemoveBlocksOperation> {
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

    const block = editor.getBlock(id);

    if (!block) {
      return {
        result: "invalid",
        reason: "block not found",
      };
    }

    return {
      result: "ok",
      value: {
        type: "delete", // TODO
        ids: [id],
      },
    };
  }
}
