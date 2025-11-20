import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getRelativeSelection, ySyncPluginKey } from "y-prosemirror";
import type { CommentBody, ThreadData, User } from "../../comments/index.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import { UserStore } from "./userstore/UserStore.js";
import { CommentMark } from "./CommentMark.js";

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

export const Comments = createExtension(
  (editor: BlockNoteEditor<any, any, any>, options) => {
    const commentsOptions = options?.comments;
    if (!commentsOptions) {
      return undefined;
    }

    const markType = CommentMark.name;
    const threadStore = commentsOptions.threadStore;
    const resolveUsers = options.resolveUsers;
    const commentEditorSchema = commentsOptions.schema;

    if (!resolveUsers) {
      // TODO check this?
      throw new Error("resolveUsers is required for comments");
    }

    const userStore = new UserStore<User>(resolveUsers);
    let pendingComment = false;
    let selectedThreadId: string | undefined;
    let threadPositions: Map<string, { from: number; to: number }> = new Map();
    const store = createStore({
      pendingComment,
      selectedThreadId,
      threadPositions,
    });
    const subscribers = new Set<
      (state: {
        pendingComment: boolean;
        selectedThreadId: string | undefined;
        threadPositions: Map<string, { from: number; to: number }>;
      }) => void
    >();

    const emitStateUpdate = () => {
      const snapshot = {
        pendingComment,
        selectedThreadId,
        threadPositions,
      };
      store.setState(snapshot);
      subscribers.forEach((cb) => cb(snapshot));
    };

    const updateMarksFromThreads = (threads: Map<string, ThreadData>) => {
      editor.transact((tr) => {
        tr.doc.descendants((node, pos) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === markType) {
              const markTypeInstance = mark.type;
              const markThreadId = mark.attrs.threadId;
              const thread = threads.get(markThreadId);
              const isOrphan = !!(
                !thread ||
                thread.resolved ||
                thread.deletedAt
              );

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
                  markTypeInstance.create({
                    ...mark.attrs,
                    orphan: isOrphan,
                  }),
                );

                if (isOrphan && selectedThreadId === markThreadId) {
                  // unselect
                  selectedThreadId = undefined;
                  emitStateUpdate();
                }
              }
            }
          });
        });
      });
    };

    return {
      key: "comments",
      store,
      plugins: [
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
              const newThreadPositions = tr.docChanged
                ? getUpdatedThreadPositions(tr.doc, markType)
                : threadPositions;

              if (newThreadPositions.size > 0 || threadPositions.size > 0) {
                // small optimization; don't emit event if threadPositions before / after were both empty
                threadPositions = newThreadPositions;
                emitStateUpdate();
              }

              // update decorations if doc or selected thread changed
              const decorations = [] as any[];

              if (selectedThreadId) {
                const selectedThreadPosition =
                  newThreadPositions.get(selectedThreadId);

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
            handleClick: (view, pos, event) => {
              if (event.button !== 0) {
                return;
              }

              const node = view.state.doc.nodeAt(pos);

              if (!node) {
                // unselect
                selectedThreadId = undefined;
                emitStateUpdate();
                return;
              }

              const commentMark = node.marks.find(
                (mark) =>
                  mark.type.name === markType && mark.attrs.orphan !== true,
              );

              const threadId = commentMark?.attrs.threadId as
                | string
                | undefined;
              if (threadId !== selectedThreadId) {
                selectedThreadId = threadId;
                emitStateUpdate();
              }
            },
          },
        }),
      ],
      threadStore: threadStore,
      init() {
        const unsubscribe = threadStore.subscribe(updateMarksFromThreads);
        editor.onCreate(() => {
          updateMarksFromThreads(threadStore.getThreads());
          editor.onSelectionChange(() => {
            if (pendingComment) {
              pendingComment = false;
              emitStateUpdate();
            }
          });
        });
        return () => unsubscribe();
      },
      onUpdate(
        callback: (state: {
          pendingComment: boolean;
          selectedThreadId: string | undefined;
          threadPositions: Map<string, { from: number; to: number }>;
        }) => void,
      ) {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      selectThread(threadId: string | undefined, scrollToThread = true) {
        if (selectedThreadId === threadId) {
          return;
        }
        selectedThreadId = threadId;
        emitStateUpdate();
        editor.transact((tr) =>
          tr.setMeta(PLUGIN_KEY, {
            name: SET_SELECTED_THREAD_ID,
          }),
        );

        if (threadId && scrollToThread) {
          const selectedThreadPosition = threadPositions.get(threadId);
          if (!selectedThreadPosition) {
            return;
          }
          (
            editor.prosemirrorView?.domAtPos(selectedThreadPosition.from)
              .node as Element | undefined
          )?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      },
      startPendingComment() {
        pendingComment = true;
        emitStateUpdate();
      },
      stopPendingComment() {
        pendingComment = false;
        emitStateUpdate();
      },
      async createThread(options: {
        initialComment: { body: CommentBody; metadata?: any };
        metadata?: any;
      }) {
        const thread = await threadStore.createThread(options);
        if (threadStore.addThreadToDocument) {
          const view = editor.prosemirrorView!;
          const pmSelection = view.state.selection;
          const ystate = ySyncPluginKey.getState(view.state);
          const selection = {
            prosemirror: {
              head: pmSelection.head,
              anchor: pmSelection.anchor,
            },
            yjs: ystate
              ? getRelativeSelection(ystate.binding, view.state)
              : undefined,
          };
          await threadStore.addThreadToDocument({
            threadId: thread.id,
            selection,
          });
        } else {
          (editor as any)._tiptapEditor.commands.setMark(markType, {
            orphan: false,
            threadId: thread.id,
          });
        }
      },
      userStore,
      commentEditorSchema,
      tiptapExtensions: [CommentMark],
    } as const;
  },
);
