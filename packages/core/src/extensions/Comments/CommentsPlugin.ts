import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 } from "uuid";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { EventEmitter } from "../../util/EventEmitter.js";
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
  selectedThreadId: string | null;
  // selectedThreadPos: number | null;
  decorations: DecorationSet;
};

function updateState(
  doc: Node,
  selectedThreadId: string | null,
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
    selectedThreadId,
    threadPositions,
    selectedThreadPos:
      selectedThreadId !== null
        ? threadPositions.get(selectedThreadId)?.to ?? null
        : null,
  };
}

export class CommentsPlugin extends EventEmitter<any> {
  public readonly plugin: Plugin;
  private provider: CommentProvider;
  private pendingComment = false;

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly markType: string
  ) {
    super();

    const doc = new Y.Doc();
    this.provider = new YjsCommentProvider(
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
          this.emit("update", {
            pendingComment: this.pendingComment,
          });
        }
      });
    }, 600);

    this.plugin = new Plugin<CommentsPluginState>({
      key: PLUGIN_KEY,
      state: {
        init() {
          return {
            threadPositions: new Map<string, { from: number; to: number }>(),
            selectedThreadId: null,
            decorations: DecorationSet.empty,
          } satisfies CommentsPluginState;
        },
        apply(tr, state) {
          const action = tr.getMeta(PLUGIN_KEY) as CommentsPluginAction;
          if (!tr.docChanged && !action) {
            return state;
          }

          if (!action) {
            // Doc changed, but no action, just update rects
            return updateState(tr.doc, state.selectedThreadId, markType);
          }
          // handle actions, possibly support more actions
          if (
            action.name === CommentsPluginActions.SET_SELECTED_THREAD_ID &&
            state.selectedThreadId !== action.data
          ) {
            return updateState(tr.doc, action.data, markType);
          }

          return state;
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

          const selectThread = (threadId: string | null) => {
            view.dispatch(
              view.state.tr.setMeta(PLUGIN_KEY, {
                name: CommentsPluginActions.SET_SELECTED_THREAD_ID,
                data: threadId,
              })
            );
          };

          const node = view.state.doc.nodeAt(pos);
          if (!node) {
            selectThread(null);
            return;
          }
          const commentMark = node.marks.find(
            (mark) => mark.type.name === markType
          );
          // don't allow selecting orphaned threads
          if (commentMark?.attrs.orphan) {
            selectThread(null);
            return;
          }
          const threadId = commentMark?.attrs.threadId as string | undefined;
          selectThread(threadId ?? null);
        },
      },
    });
  }

  public onUpdate(callback: (state: { pendingComment: boolean }) => void) {
    return this.on("update", callback);
  }

  public addPendingComment() {
    this.pendingComment = true;
    this.emit("update", {
      pendingComment: this.pendingComment,
    });
  }

  public async createThread(body: CommentBody) {
    const thread = await this.provider.createThread({
      initialComment: {
        body,
      },
    });
    this.editor._tiptapEditor.commands.setMark(this.markType, {
      threadId: thread.id,
    });
  }
}

type CommentBody = any;

type CommentReaction = {
  emoji: string;
  createdAt: Date;
  users: {
    id: string;
  }[];
};

type Comment = {
  type: "comment";
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  reactions: CommentReaction[];
  // attachments: CommentAttachment[];
  metadata: any;
  body: CommentBody;
};

type Thread = {
  type: "thread";
  id: string;
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
  resolved: boolean;
  resolvedUpdatedAt?: Date;
  metadata: any;
};

export abstract class CommentProvider {
  abstract createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<Thread>;
}

export class YjsCommentProvider extends CommentProvider {
  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly userId: string,
    private readonly threadsYMap: Y.Map<any>
  ) {
    super();
  }

  private commentToYMap(comment: Comment) {
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

  private threadToYMap(thread: Thread) {
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

  public async createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }) {
    const date = new Date();

    const comment: Comment = {
      type: "comment",
      id: v4(),
      userId: this.userId,
      createdAt: date,
      updatedAt: date,
      reactions: [],
      metadata: options.metadata,
      body: options.initialComment.body,
    };

    const thread: Thread = {
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

export class LiveblocksCommentProvider {
  constructor(private readonly editor: BlockNoteEditor<any, any, any>) {}

  public async createThread() {
    const x = useCreateThread();
    return x;
  }
}

export class TiptapCommentProvider {
  constructor(private readonly editor: BlockNoteEditor<any, any, any>) {}

  public async createThread() {
    this.editor._tiptapEditor.commands.setMark(this.markType, { threadId: id });
  }
}
