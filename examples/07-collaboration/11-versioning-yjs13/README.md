# Local Storage Versioning (Yjs v13, Experimental)

This experimental playground example shows how to use the `VersioningExtension` with collaborative editing using Yjs v13. Snapshots are stored in localStorage using Yjs state updates.

The sidebar opens on a document with a few versions already in its history, so you can preview and rename them. Comparison and restore are not supported. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button and press "Save version" to add a version of your own.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Real-time collaboration](/docs/features/collaboration)
