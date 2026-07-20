# YHub Multi-Doc

This example shows a multi-document collaborative editor with per-document version history, using BlockNote's `VersioningExtension` and Y.js v14.

**Features:**

- User picker (per-tab identity via `sessionStorage`)
- Left sidebar with document list (create, rename, delete)
- Collaborative editing with Y.js (including suggestion mode)
- Right sidebar with version history powered by `VersioningSidebar`
- Per-document versioning backed by `localStorage`
- Open multiple tabs with different users via the `?as=` URL param

**Relevant Docs:**

- [Versioning](https://www.blocknotejs.org/docs/collaboration/versioning)
- [Y.js Collaboration](https://www.blocknotejs.org/docs/collaboration)
