import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getRelativeSelection, ySyncPluginKey } from "y-prosemirror";
import type {
  CommentBody,
  ThreadData,
  ThreadStore,
  User,
} from "../../comments/index.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { CustomBlockNoteSchema } from "../../schema/schema.js";
import { UserStore } from "./userstore/UserStore.js";

const PLUGIN_KEY = new PluginKey(`blocknote-comments`);
const SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID";

type CommentsPluginState = {
  /**
   * Decorations to be rendered, specifically to indicate the selected thread
   */
  decorations: DecorationSet;
};

/**
 * Calculate the thread positions from the current document state
 */
function getUpdatedThreadPositions(doc: Node, markType: string) {
  const threadPositions = new Map<string, { from: number; to: number }>();

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
      }
    });
  });
  return threadPositions;
}

export class CommentsPlugin extends BlockNoteExtension {
  public static key() {
    return "comments";
  }

  public readonly userStore: UserStore<User>;

  /**
   * Whether a comment is currently being composed
   */
  private pendingComment = false;

  /**
   * The currently selected thread id
   */
  private selectedThreadId: string | undefined;

  /**
   * Store the positions of all threads in the document.
   * this can be used later to implement a floating sidebar
   */
  private threadPositions: Map<string, { from: number; to: number }> =
    new Map();

  private emitStateUpdate() {
    this.emit("update", {
      selectedThreadId: this.selectedThreadId,
      pendingComment: this.pendingComment,
      threadPositions: this.threadPositions,
    });
  }

  /**
   * when a thread is resolved or deleted, we need to update the marks to reflect the new state
   */
  private updateMarksFromThreads = (threads: Map<string, ThreadData>) => {
    this.editor.transact((tr) => {
      tr.doc.descendants((node, pos) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === this.markType) {
            const markType = mark.type;
            const markThreadId = mark.attrs.threadId;
            const thread = threads.get(markThreadId);
            const isOrphan = !!(!thread || thread.resolved || thread.deletedAt);

            if (isOrphan !== mark.attrs.orphan) {
              const trimmedFrom = Math.max(pos, 0);
              const trimmedTo = Math.min(
                pos + node.nodeSize,
                tr.doc.content.size - 1,
                tr.doc.content.size - 1,
              );
              tr.removeMark(trimmedFrom, trimmedTo, mark);
              tr.addMark(
                trimmedFrom,
                trimmedTo,
                markType.create({
                  ...mark.attrs,
                  orphan: isOrphan,
                }),
              );

              if (isOrphan && this.selectedThreadId === markThreadId) {
                // unselect
                this.selectedThreadId = undefined;
                this.emitStateUpdate();
              }
            }
          }
        });
      });
    });
  };

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    public readonly threadStore: ThreadStore,
    private readonly markType: string,
    public readonly resolveUsers:
      | undefined
      | ((userIds: string[]) => Promise<User[]>),
    public readonly commentEditorSchema?: CustomBlockNoteSchema<any, any, any>,
  ) {
    super();

    if (!resolveUsers) {
      throw new Error("resolveUsers is required for comments");
    }
    this.userStore = new UserStore<User>(resolveUsers);

    // Note: Plugins are currently not destroyed when the editor is destroyed.
    // We should unsubscribe from the threadStore when the editor is destroyed.
    this.threadStore.subscribe(this.updateMarksFromThreads);

    editor.onCreate(() => {
      // Need to wait for TipTap editor state to be initialized
      this.updateMarksFromThreads(this.threadStore.getThreads());
      editor.onSelectionChange(() => {
        if (this.pendingComment) {
          this.pendingComment = false;
          this.emitStateUpdate();
        }
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    this.addProsemirrorPlugin(
      new Plugin<CommentsPluginState>({
        key: PLUGIN_KEY,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, state) {
            const action = tr.getMeta(PLUGIN_KEY);

            if (!tr.docChanged && !action) {
              return state;
            }

            // only update threadPositions if the doc changed
            const threadPositions = tr.docChanged
              ? getUpdatedThreadPositions(tr.doc, self.markType)
              : self.threadPositions;

            if (threadPositions.size > 0 || self.threadPositions.size > 0) {
              // small optimization; don't emit event if threadPositions before / after were both empty
              self.threadPositions = threadPositions;
              self.emitStateUpdate();
            }

            // update decorations if doc or selected thread changed
            const decorations = [];

            if (self.selectedThreadId) {
              const selectedThreadPosition = threadPositions.get(
                self.selectedThreadId,
              );

              if (selectedThreadPosition) {
                decorations.push(
                  Decoration.inline(
                    selectedThreadPosition.from,
                    selectedThreadPosition.to,
                    {
                      class: "bn-thread-mark-selected",
                    },
                  ),
                );
              }
            }

            return {
              decorations: DecorationSet.create(tr.doc, decorations),
            };
          },
        },
        props: {
          decorations(state) {
            return (
              PLUGIN_KEY.getState(state)?.decorations ?? DecorationSet.empty
            );
          },
          /**
           * Handle click on a thread mark and mark it as selected
           */
          handleClick: (view, pos, event) => {
            if (event.button !== 0) {
              return;
            }

            const node = view.state.doc.nodeAt(pos);

            if (!node) {
              self.selectThread(undefined);
              return;
            }

            const commentMark = node.marks.find(
              (mark) =>
                mark.type.name === markType && mark.attrs.orphan !== true,
            );

            const threadId = commentMark?.attrs.threadId as string | undefined;
            self.selectThread(threadId, false);
          },
        },
      }),
    );
  }

  /**
   * Subscribe to state updates
   */
  public onUpdate(
    callback: (state: {
      pendingComment: boolean;
      selectedThreadId: string | undefined;
      threadPositions: Map<string, { from: number; to: number }>;
    }) => void,
  ) {
    return this.on("update", callback);
  }

  /**
   * Set the selected thread
   */
  public selectThread(threadId: string | undefined, scrollToThread = true) {
    if (this.selectedThreadId === threadId) {
      return;
    }
    this.selectedThreadId = threadId;
    this.emitStateUpdate();
    this.editor.transact((tr) =>
      tr.setMeta(PLUGIN_KEY, {
        name: SET_SELECTED_THREAD_ID,
      }),
    );

    if (threadId && scrollToThread) {
      const selectedThreadPosition = this.threadPositions.get(threadId);

      if (!selectedThreadPosition) {
        return;
      }

      // When a new thread is selected, scrolls the page to its reference text in
      // the editor.
      (
        this.editor.prosemirrorView?.domAtPos(selectedThreadPosition.from)
          .node as Element | undefined
      )?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  /**
   * Start a pending comment (e.g.: when clicking the "Add comment" button)
   */
  public startPendingComment() {
    this.pendingComment = true;
    this.emitStateUpdate();
  }

  /**
   * Stop a pending comment (e.g.: user closes the comment composer)
   */
  public stopPendingComment() {
    this.pendingComment = false;
    this.emitStateUpdate();
  }

  /**
   * Create a thread at the current selection
   */
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
        yjs: ystate
          ? getRelativeSelection(ystate.binding, view.state)
          : undefined, // if we're not using yjs
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
