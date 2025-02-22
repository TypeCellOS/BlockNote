import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getRelativeSelection, ySyncPluginKey } from "y-prosemirror";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { User } from "../../models/User.js";
import { EventEmitter } from "../../util/EventEmitter.js";
import { ThreadStore } from "./threadstore/ThreadStore.js";
import { CommentBody, ThreadData } from "./types.js";
import { UserStore } from "./userstore/UserStore.js";
const PLUGIN_KEY = new PluginKey(`blocknote-comments`);

const SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID";

type CommentsPluginAction = {
  name: typeof SET_SELECTED_THREAD_ID;
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
  public readonly userStore: UserStore<User>;

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
          const isOrphan = !!(!thread || thread.resolved || thread.deletedAt);

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
    public readonly threadStore: ThreadStore,
    private readonly markType: string
  ) {
    super();

    if (!editor.resolveUsers) {
      throw new Error("resolveUsers is required for comments");
    }
    this.userStore = new UserStore<User>(editor.resolveUsers);

    // TODO: unsubscribe
    this.threadStore.subscribe(this.updateMarksFromThreads);

    // initial
    this.updateMarksFromThreads(this.threadStore.getThreads());

    // TODO: remove settimeout
    setTimeout(() => {
      editor.onSelectionChange(() => {
        if (this.pendingComment) {
          this.pendingComment = false;
          this.emitStateUpdate();
        }
      });
    }, 600);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
                name: SET_SELECTED_THREAD_ID,
              })
            );
          };

          const node = view.state.doc.nodeAt(pos);
          if (!node) {
            selectThread(undefined);
            return;
          }
          const commentMark = node.marks.find(
            (mark) => mark.type.name === markType && mark.attrs.orphan !== true
          );

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
    const thread = await this.threadStore.createThread(options);

    if (this.threadStore.addThreadToDocument) {
      // creating the mark is handled by the store
      // this is useful if we don't have write-access to the document.
      // We can then offload the responsibility of creating the mark to the server.
      // (e.g.: RESTYjsThreadStore)
      const view = this.editor.prosemirrorView!;
      const pmSelection = view.state.selection;

      const ystate = ySyncPluginKey.getState(view.state);

      const selection = {
        prosemirror: {
          head: pmSelection.head,
          anchor: pmSelection.anchor,
        },
        yjs: getRelativeSelection(ystate.binding, view.state),
      };

      await this.threadStore.addThreadToDocument({
        threadId: thread.id,
        selection,
      });
    } else {
      // we create the mark directly in the document
      this.editor._tiptapEditor.commands.setMark(this.markType, {
        orphan: false,
        threadId: thread.id,
      });
    }
  }
}
