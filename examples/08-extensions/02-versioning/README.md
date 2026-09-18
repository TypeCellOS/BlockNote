# In-Memory Versioning

This example shows how to use the `VersioningExtension` without any collaboration layer (no Yjs required). Snapshots are stored in memory using ProseMirror JSON.

The sidebar opens on a document with a few versions already in its history, so you can preview them, compare them, rename them, and restore them right away. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button and press "Save version" to add a version of your own.
