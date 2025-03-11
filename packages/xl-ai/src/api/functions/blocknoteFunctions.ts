export type InsertBlocksOperation = {
  type: "insert";
  referenceId: string;
  position: "before" | "after";
  blocks: any[];
};

export type UpdateBlocksOperation = {
  type: "update";
  id: string;
  block: any;
};

export type RemoveBlocksOperation = {
  type: "remove";
  ids: string[];
};

export type BlockNoteOperation =
  | InsertBlocksOperation
  | UpdateBlocksOperation
  | RemoveBlocksOperation;

export type InvalidOrOk<T> =
  | {
      result: "invalid";
      reason: string;
    }
  | { result: "ok"; value: T };
