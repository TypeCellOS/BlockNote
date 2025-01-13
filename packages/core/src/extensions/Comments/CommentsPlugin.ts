import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 } from "uuid";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { EventEmitter } from "../../util/EventEmitter.js";
import { CommentBody, CommentData, ThreadData } from "./types.js";
const PLUGIN_KEY = new PluginKey(`blocknote-comments`);

enum CommentsPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

type CommentsPluginAction = {
  name: CommentsPluginActions;
  data: string | null;
};

type CommentsPluginState = {
  threadPositions: Map<string, { from: number; to: number }>;
  // selectedThreadId: string | null;
  // selectedThreadPos: number | null;
  decorations: DecorationSet;
};

function updateState(
  doc: Node,
  selectedThreadId: string | undefined,
  markType: string
) {
  const threadPositions = new Map<string, { from: number; to: number }>();
  const decorations: Decoration[] = [];
  // find all thread marks and store their position + create decoration for selected thread
  doc.descendants((node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === markType) {
        const thisThreadId = (mark.attrs as { threadId: string | undefined })
          .threadId;
        if (!thisThreadId) {
          return;
        }
        const from = pos;
        const to = from + node.nodeSize;

        // FloatingThreads component uses "to" as the position, so always store the largest "to" found
        // AnchoredThreads component uses "from" as the position, so always store the smallest "from" found
        const currentPosition = threadPositions.get(thisThreadId) ?? {
          from: Infinity,
          to: 0,
        };
        threadPositions.set(thisThreadId, {
          from: Math.min(from, currentPosition.from),
          to: Math.max(to, currentPosition.to),
        });

        if (selectedThreadId === thisThreadId) {
          decorations.push(
            Decoration.inline(from, to, {
              class: "bn-thread-mark-selected",
            })
          );
        }
      }
    });
  });
  return {
    decorations: DecorationSet.create(doc, decorations),
    threadPositions,
  };
}

export class CommentsPlugin extends EventEmitter<any> {
  public readonly plugin: Plugin;
  public readonly store: ThreadStore;
  private pendingComment = false;
  private selectedThreadId: string | undefined;

  private emitStateUpdate() {
    this.emit("update", {
      selectedThreadId: this.selectedThreadId,
      pendingComment: this.pendingComment,
    });
  }

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly markType: string
  ) {
    super();

    const doc = new Y.Doc();
    this.store = new YjsThreadStore(
      editor,
      "blablauserid",
      doc.getMap("threads")
    );

    // TODO
    setTimeout(() => {
      editor.onSelectionChange(() => {
        // TODO: filter out yjs transactions
        if (this.pendingComment) {
          this.pendingComment = false;
          this.emitStateUpdate();
        }
      });
    }, 600);

    const self = this;

    this.plugin = new Plugin<CommentsPluginState>({
      key: PLUGIN_KEY,
      state: {
        init() {
          return {
            threadPositions: new Map<string, { from: number; to: number }>(),
            decorations: DecorationSet.empty,
          } satisfies CommentsPluginState;
        },
        apply(tr, state) {
          const action = tr.getMeta(PLUGIN_KEY) as CommentsPluginAction;
          if (!tr.docChanged && !action) {
            return state;
          }

          // Doc changed, but no action, just update rects
          return updateState(tr.doc, self.selectedThreadId, markType);
        },
      },
      props: {
        decorations(state) {
          return PLUGIN_KEY.getState(state)?.decorations ?? DecorationSet.empty;
        },
        handleClick: (view, pos, event) => {
          if (event.button !== 0) {
            return;
          }

          const selectThread = (threadId: string | undefined) => {
            self.selectedThreadId = threadId;
            self.emitStateUpdate();
            view.dispatch(
              view.state.tr.setMeta(PLUGIN_KEY, {
                name: CommentsPluginActions.SET_SELECTED_THREAD_ID,
              })
            );
          };

          const node = view.state.doc.nodeAt(pos);
          if (!node) {
            selectThread(undefined);
            return;
          }
          const commentMark = node.marks.find(
            (mark) => mark.type.name === markType
          );
          // don't allow selecting orphaned threads
          if (commentMark?.attrs.orphan) {
            selectThread(undefined);
            return;
          }
          const threadId = commentMark?.attrs.threadId as string | undefined;
          selectThread(threadId);
        },
      },
    });
  }

  public onUpdate(
    callback: (state: {
      pendingComment: boolean;
      selectedThreadId: string | undefined;
    }) => void
  ) {
    return this.on("update", callback);
  }

  public addPendingComment() {
    this.pendingComment = true;
    this.emitStateUpdate();
  }

  public async createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }) {
    const thread = await this.store.createThread(options);
    this.editor._tiptapEditor.commands.setMark(this.markType, {
      threadId: thread.id,
    });
  }
}

export abstract class ThreadStore {
  abstract createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<ThreadData>;

  abstract getThread(threadId: string): ThreadData;
}

export class YjsThreadStore extends ThreadStore {
  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly userId: string,
    private readonly threadsYMap: Y.Map<any>
  ) {
    super();
  }

  private commentToYMap(comment: CommentData) {
    const yMap = new Y.Map<any>();
    yMap.set("id", comment.id);
    yMap.set("userId", comment.userId);
    yMap.set("createdAt", comment.createdAt.toISOString());
    yMap.set("updatedAt", comment.updatedAt.toISOString());
    if (comment.reactions.length > 0) {
      throw new Error("Reactions should be empty in commentToYMap");
    }
    yMap.set("reactions", new Y.Array());
    yMap.set("metadata", comment.metadata);
    yMap.set("body", comment.body);
    return yMap;
  }

  private threadToYMap(thread: ThreadData) {
    const yMap = new Y.Map();
    yMap.set("id", thread.id);
    yMap.set("createdAt", thread.createdAt.toISOString());
    yMap.set("updatedAt", thread.updatedAt.toISOString());
    const commentsArray = new Y.Array<Y.Map<any>>();

    commentsArray.push(
      thread.comments.map((comment) => this.commentToYMap(comment))
    );

    yMap.set("comments", commentsArray);
    yMap.set("resolved", thread.resolved);
    yMap.set("resolvedUpdatedAt", thread.resolvedUpdatedAt?.toISOString());
    yMap.set("metadata", thread.metadata);
    return yMap;
  }

  private yMapToComment(yMap: Y.Map<any>): CommentData {
    return {
      type: "comment",
      id: yMap.get("id"),
      userId: yMap.get("userId"),
      createdAt: new Date(yMap.get("createdAt")),
      updatedAt: new Date(yMap.get("updatedAt")),
      reactions: [],
      metadata: yMap.get("metadata"),
      body: yMap.get("body"),
    };
  }

  private yMapToThread(yMap: Y.Map<any>): ThreadData {
    return {
      type: "thread",
      id: yMap.get("id"),
      createdAt: new Date(yMap.get("createdAt")),
      updatedAt: new Date(yMap.get("updatedAt")),
      comments: ((yMap.get("comments") as Y.Array<Y.Map<any>>) || []).map(
        (comment) => this.yMapToComment(comment)
      ),
      resolved: yMap.get("resolved"),
      resolvedUpdatedAt: yMap.get("resolvedUpdatedAt"),
      metadata: yMap.get("metadata"),
    };
  }

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    const thread = this.yMapToThread(this.threadsYMap.get(threadId));
    return thread;
  }

  public async createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }) {
    const date = new Date();

    const comment: CommentData = {
      type: "comment",
      id: v4(),
      userId: this.userId,
      createdAt: date,
      updatedAt: date,
      reactions: [],
      metadata: options.metadata,
      body: options.initialComment.body,
    };

    const thread: ThreadData = {
      type: "thread",
      id: v4(),
      createdAt: date,
      updatedAt: date,
      comments: [comment],
      resolved: false,
      metadata: options.metadata,
    };

    this.threadsYMap.set(thread.id, this.threadToYMap(thread));

    return thread;
  }
}

export class LiveblocksThreadStore {
  constructor(private readonly editor: BlockNoteEditor<any, any, any>) {}

  public async createThread() {
    const x = useCreateThread();
    return x;
  }
}

export class TiptapThreadStore {
  constructor(private readonly editor: BlockNoteEditor<any, any, any>) {}

  public async createThread() {
    this.editor._tiptapEditor.commands.setMark(this.markType, { threadId: id });
  }
}
