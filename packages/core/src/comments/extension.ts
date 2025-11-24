import { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getRelativeSelection, ySyncPluginKey } from "y-prosemirror";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../editor/BlockNoteExtension.js";
import { ShowSelectionExtension } from "../extensions/ShowSelection/ShowSelection.js";
import { CustomBlockNoteSchema } from "../schema/schema.js";
import { CommentMark } from "./mark.js";
import type { ThreadStore } from "./threadstore/ThreadStore.js";
import type { CommentBody, ThreadData } from "./types.js";
import { User } from "./types.js";
import { UserStore } from "./userstore/UserStore.js";

const PLUGIN_KEY = new PluginKey("blocknote-comments");

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

export const CommentsExtension = createExtension(
  ({
    editor,
    options: { schema: commentEditorSchema, threadStore, resolveUsers },
  }: ExtensionOptions<{
    /**
     * The thread store implementation to use for storing and retrieving comment threads
     */
    threadStore: ThreadStore;
    /**
     * Resolve user information for comments.
     *
     * See [Comments](https://www.blocknotejs.org/docs/features/collaboration/comments) for more info.
     */
    resolveUsers: (userIds: string[]) => Promise<User[]>;
    /**
     * A schema to use for the comment editor (which allows you to customize the blocks and styles that are available in the comment editor)
     */
    schema?: CustomBlockNoteSchema<any, any, any>;
  }>) => {
    if (!resolveUsers) {
      throw new Error(
        "resolveUsers is required to be defined when using comments",
      );
    }
    if (!threadStore) {
      throw new Error(
        "threadStore is required to be defined when using comments",
      );
    }
    const markType = CommentMark.name;

    const userStore = new UserStore<User>(resolveUsers);
    const store = createStore(
      {
        pendingComment: false,
        selectedThreadId: undefined as string | undefined,
        threadPositions: new Map<string, { from: number; to: number }>(),
      },
      {
        onUpdate() {
          // If the selected thread id changed, we need to update the decorations
          if (
            store.state.selectedThreadId !== store.prevState.selectedThreadId
          ) {
            // So, we issue a transaction to update the decorations
            editor.transact((tr) => tr.setMeta(PLUGIN_KEY, true));
          }
        },
      },
    );

    const updateMarksFromThreads = (threads: Map<string, ThreadData>) => {
      editor.transact((tr) => {
        tr.doc.descendants((node, pos) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === markType) {
              const markTypeInstance = mark.type;
              const markThreadId = mark.attrs.threadId as string;
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

                if (isOrphan && store.state.selectedThreadId === markThreadId) {
                  // unselect
                  store.setState((prev) => ({
                    ...prev,
                    selectedThreadId: undefined,
                  }));
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
      prosemirrorPlugins: [
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
                : store.state.threadPositions;

              if (
                newThreadPositions.size > 0 ||
                store.state.threadPositions.size > 0
              ) {
                // small optimization; don't emit event if threadPositions before / after were both empty
                store.setState((prev) => ({
                  ...prev,
                  threadPositions: newThreadPositions,
                }));
              }

              // update decorations if doc or selected thread changed
              const decorations = [] as any[];

              if (store.state.selectedThreadId) {
                const selectedThreadPosition = newThreadPositions.get(
                  store.state.selectedThreadId,
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
            handleClick: (view, pos, event) => {
              if (event.button !== 0) {
                return;
              }

              const node = view.state.doc.nodeAt(pos);

              if (!node) {
                // unselect
                store.setState((prev) => ({
                  ...prev,
                  selectedThreadId: undefined,
                }));
                return;
              }

              const commentMark = node.marks.find(
                (mark) =>
                  mark.type.name === markType && mark.attrs.orphan !== true,
              );

              const threadId = commentMark?.attrs.threadId as
                | string
                | undefined;
              if (threadId !== store.state.selectedThreadId) {
                store.setState((prev) => ({
                  ...prev,
                  selectedThreadId: threadId,
                }));
              }
            },
          },
        }),
      ],
      threadStore: threadStore,
      mount() {
        const unsubscribe = threadStore.subscribe(updateMarksFromThreads);
        updateMarksFromThreads(threadStore.getThreads());

        const unsubscribeOnSelectionChange = editor.onSelectionChange(() => {
          if (store.state.pendingComment) {
            store.setState((prev) => ({
              ...prev,
              pendingComment: false,
            }));
          }
        });

        return () => {
          unsubscribe();
          unsubscribeOnSelectionChange();
        };
      },
      selectThread(threadId: string | undefined, scrollToThread = true) {
        if (store.state.selectedThreadId === threadId) {
          return;
        }
        store.setState((prev) => ({
          ...prev,
          pendingComment: false,
          selectedThreadId: threadId,
        }));

        if (threadId && scrollToThread) {
          const selectedThreadPosition =
            store.state.threadPositions.get(threadId);
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
        store.setState((prev) => ({
          ...prev,
          selectedThreadId: undefined,
          pendingComment: true,
        }));
        editor.getExtension(ShowSelectionExtension)?.showSelection(true);
      },
      stopPendingComment() {
        store.setState((prev) => ({
          ...prev,
          selectedThreadId: undefined,
          pendingComment: false,
        }));
        editor.getExtension(ShowSelectionExtension)?.showSelection(false);
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
