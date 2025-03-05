"use client";

import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  ThreadStreamView,
  useComponentsContext,
  useCreateBlockNote,
} from "@blocknote/react";
import { MantineProvider } from "@mantine/core";
import { YDocProvider, useYDoc, useYjsProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";
import { HARDCODED_USERS, MyUserType, getRandomColor } from "./userdata.js";

import "./style.css";

// The resolveUsers function fetches information about your users
// (e.g. their name, avatar, etc.). Usually, you'd fetch this from your
// own database or user management system.
// Here, we just return the hardcoded users (from userdata.ts)
async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

const UserSelect = (props: {
  users: MyUserType[];
  userId: string;
  setUserId: (userId: string) => void;
}) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root className={"bn-toolbar"}>
      <h1>User Select</h1>
      <Components.FormattingToolbar.Select
        className={"bn-select"}
        items={props.users.map((user) => ({
          text: user.username,
          icon: null,
          onClick: () => props.setUserId(user.id),
          isSelected: user.id === props.userId,
        }))}
      />
    </Components.FormattingToolbar.Root>
  );
};

const CommentTypeSelect = (props: {
  commentType: "open" | "resolved";
  setCommentType: (commentType: "open" | "resolved") => void;
}) => {
  const Components = useComponentsContext()!;

  return (
    <Components.FormattingToolbar.Root className={"bn-toolbar"}>
      <h1>Comments</h1>
      <Components.FormattingToolbar.Select
        className={"bn-select"}
        items={[
          {
            text: "Open",
            icon: null,
            onClick: () => props.setCommentType("open"),
            isSelected: props.commentType === "open",
          },
          {
            text: "Resolved",
            icon: null,
            onClick: () => props.setCommentType("resolved"),
            isSelected: props.commentType === "resolved",
          }
        ]}
      />
    </Components.FormattingToolbar.Root>
  );
};

// This follows the Y-Sweet example to setup a collabotive editor
// (but of course, you also use other collaboration providers
// see the docs for more information)
export default function App() {
  const docId = "my-blocknote-document-with-comments-1";

  return (
    <MantineProvider>
      <YDocProvider
        docId={docId}
        authEndpoint="https://demos.y-sweet.dev/api/auth">
        <Document />
      </YDocProvider>
    </MantineProvider>
  );
}

function Document() {
  const [user, setUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const [commentType, setCommentType] = useState<"open" | "resolved">("open");
  const provider = useYjsProvider();

  // take the Y.Doc collaborative document from Y-Sweet
  const doc = useYDoc();

  // setup the thread store which stores / and syncs thread / comment data
  const threadStore = useMemo(() => {
    // (alternative, use TiptapCollabProvider)
    // const provider = new TiptapCollabProvider({
    //   name: "test",
    //   baseUrl: "https://collab.yourdomain.com",
    //   appId: "test",
    //   document: doc,
    // });
    // return new TiptapThreadStore(
    //   user.id,
    //   provider,
    //   new DefaultThreadStoreAuth(user.id, user.role)
    // );
    return new YjsThreadStore(
      user.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(user.id, user.role)
    );
  }, [doc, user]);

  // setup the editor with comments and collaboration
  const editor = useCreateBlockNote(
    {
      resolveUsers,
      comments: {
        threadStore,
      },
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: { color: getRandomColor(), name: user.username },
      },
    },
    [user, threadStore]
  );

  return (
    <BlockNoteView
      className={"bn-main"}
      editor={editor}
      editable={user.role === "editor"}
      renderEditor={false}>
      <div className={"bn-editor-and-thread-stream"}>
        <div className={"bn-editor-wrapper"}>
          <div className={"bn-select-header"}>
            <UserSelect
              users={HARDCODED_USERS}
              userId={user.id}
              setUserId={(userId) =>
                setUser(HARDCODED_USERS.find((user) => user.id === userId)!)
              }
            />
          </div>
          <BlockNoteViewEditor />
        </div>
        <div className={"bn-thread-stream-wrapper"}>
          <div className={"bn-select-header"}>
            <CommentTypeSelect commentType={commentType} setCommentType={setCommentType}/>
          </div>
          <ThreadStreamView commentType={commentType} />
        </div>
      </div>
    </BlockNoteView>
  );
}
