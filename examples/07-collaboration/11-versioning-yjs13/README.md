# Local Storage Versioning (yjs v13)

This example shows how to use the `VersioningExtension` with collaborative editing using `yjs` (v13). Snapshots are stored in localStorage using Yjs state updates.

The sidebar opens on a document with a few versions already in its history, so you can preview them, rename them, and restore them right away. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button and press "Save version" to add a version of your own.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Real-time collaboration](/docs/features/collaboration)
