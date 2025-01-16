import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { EventEmitter } from "../../util/EventEmitter.js";
import { ThreadStore } from "./threadstore/ThreadStore.js";
import { YjsThreadStore } from "./threadstore/YjsThreadStore.js";
import { CommentBody, ThreadData, User } from "./types.js";
import { UserStore } from "./userstore/UserStore.js";
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

  /**
   * when a thread is resolved or deleted, we need to update the marks to reflect the new state
   */
  private updateMarksFromThreads = (threads: Map<string, ThreadData>) => {
    const doc = new Y.Doc();
    const threadMap = doc.getMap("threads");
    threads.forEach((thread) => {
      threadMap.set(thread.id, thread);
    });

    const ttEditor = this.editor._tiptapEditor;
    if (!ttEditor) {
      // TODO: better lifecycle management
      return;
    }

    ttEditor.state.doc.descendants((node, pos) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === this.markType) {
          const markType = mark.type;
          const markThreadId = mark.attrs.threadId;
          const thread = threads.get(markThreadId);
          const isOrphan = !thread || thread.resolved || thread.deletedAt;

          if (isOrphan !== mark.attrs.orphan) {
            const { tr } = ttEditor.state;
            const trimmedFrom = Math.max(pos, 0);
            const trimmedTo = Math.min(
              pos + node.nodeSize,
              ttEditor.state.doc.content.size - 1
            );
            tr.removeMark(trimmedFrom, trimmedTo, markType);
            tr.addMark(
              trimmedFrom,
              trimmedTo,
              markType.create({
                ...mark.attrs,
                orphan: isOrphan,
              })
            );
            ttEditor.dispatch(tr);

            if (isOrphan && this.selectedThreadId === markThreadId) {
              // unselect
              this.selectedThreadId = undefined;
              this.emitStateUpdate();
            }
          }
        }
      });
    });
  };

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly markType: string,
    public readonly userStore = new UserStore<User>(async (userIds) => {
      // fake slow network request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // random username
      const names = ["John Doe", "Jane Doe", "John Smith", "Jane Smith"];
      const username = names[Math.floor(Math.random() * names.length)];

      return userIds.map((id) => ({
        id,
        username,
        avatarUrl: `https://placehold.co/100x100?text=${username}`,
      }));
    })
  ) {
    super();

    const doc = new Y.Doc();
    this.store = new YjsThreadStore(
      editor,
      "blablauserid",
      doc.getMap("threads")
    );

    // TODO: unsubscribe
    this.store.subscribe(this.updateMarksFromThreads);

    // initial
    this.updateMarksFromThreads(this.store.getThreads());

    // TODO: remove settimeout
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

  public startPendingComment() {
    this.pendingComment = true;
    this.emitStateUpdate();
  }

  public stopPendingComment() {
    this.pendingComment = false;
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
