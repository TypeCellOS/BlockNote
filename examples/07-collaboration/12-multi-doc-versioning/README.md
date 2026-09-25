# YHub Multi-Doc

This example shows a multi-document collaborative editor with per-document version history, using BlockNote's `VersioningExtension` and Y.js v14. Sync and history both come from [YHub](https://github.com/yjs/yhub), which records every edit and groups them into versions.

A first visit creates a sample document whose history already has several versions by several users, so the history sidebar has something to show right away. The editor is read-only while the sidebar is open: close it to edit, then reopen it with the "History" button.

**Features:**

- User picker (per-tab identity via `sessionStorage`)
- Left sidebar with document list (create, rename, delete)
- Collaborative editing with Y.js (including suggestion mode)
- Right sidebar with version history powered by `VersioningSidebar`
- Per-document version history backed by YHub
- Open multiple tabs with different users via the `?as=` URL param

**Relevant Docs:**

- [Versioning](https://www.blocknotejs.org/docs/collaboration/versioning)
- [Y.js Collaboration](https://www.blocknotejs.org/docs/collaboration)
