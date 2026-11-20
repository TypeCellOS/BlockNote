import { en } from "@blocknote/core/locales";
import type { CommentData, ThreadData } from "@blocknote/core/comments";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { Comment } from "./Comment.js";

const { passThrough, components, allow } = vi.hoisted(() => {
  const passThrough = ({ children }: { children?: ReactNode }) => (
    <>{children}</>
  );

  // Stand-ins for the UI library components. Like the real Mantine, Ariakit
  // and ShadCN toolbar buttons, this one uses `label` as its `aria-label`.
  const components = {
    Comments: {
      Comment: ({ actions }: { actions?: ReactNode }) => <div>{actions}</div>,
    },
    Generic: {
      Toolbar: {
        Root: passThrough,
        Button: ({
          label,
          children,
        }: {
          label?: string;
          children?: ReactNode;
        }) => <button aria-label={label}>{children}</button>,
      },
      Menu: {
        Root: passThrough,
        Trigger: passThrough,
        Dropdown: () => null,
        Item: () => null,
      },
    },
  };

  return { passThrough, components, allow: () => true };
});

vi.mock("../../editor/ComponentsContext.js", () => ({
  useComponentsContext: () => components,
}));
vi.mock("../../editor/PortalElementOverride.js", () => ({
  usePortalElement: () => undefined,
}));
vi.mock("../../i18n/dictionary.js", () => ({
  useDictionary: () => en,
}));
vi.mock("../../hooks/useExtension.js", () => ({
  useExtension: () => ({
    threadStore: {
      auth: {
        canAddReaction: allow,
        canDeleteComment: allow,
        canUpdateComment: allow,
        canResolveThread: allow,
        canUnresolveThread: allow,
      },
    },
  }),
}));
vi.mock("../../hooks/useCreateBlockNote.js", () => ({
  useCreateBlockNote: () => ({ getExtension: () => ({ submit: vi.fn() }) }),
}));
vi.mock("./useCommentUsers.js", () => ({ useCommentUser: () => undefined }));
vi.mock("./CommentEditor.js", () => ({ CommentEditor: () => null }));
vi.mock("./EmojiPicker.js", () => ({ EmojiPicker: passThrough }));

const date = new Date(2026, 0, 1);
const comment = {
  type: "comment",
  id: "comment-1",
  userId: "user-1",
  createdAt: date,
  updatedAt: date,
  reactions: [],
  metadata: {},
  body: [],
} as unknown as CommentData;

function thread(resolved: boolean) {
  return {
    type: "thread",
    id: "thread-1",
    createdAt: date,
    updatedAt: date,
    comments: [comment],
    resolved,
    metadata: {},
  } as unknown as ThreadData;
}

describe("Comment actions", () => {
  it.each([
    [false, en.comments.actions.resolve],
    [true, en.comments.actions.reopen],
  ])(
    "icon-only buttons have an accessible name (resolved: %s)",
    (resolved, resolveOrReopen) => {
      const html = renderToStaticMarkup(
        <Comment
          comment={comment}
          thread={thread(resolved)}
          showResolveButton
        />,
      );

      const buttons = html.match(/<button[^>]*>/g) ?? [];
      expect(
        buttons.map((button) => button.match(/aria-label="([^"]*)"/)?.[1]),
      ).toEqual([
        en.comments.actions.add_reaction,
        resolveOrReopen,
        en.comments.actions.more_actions,
      ]);
    },
  );
});
