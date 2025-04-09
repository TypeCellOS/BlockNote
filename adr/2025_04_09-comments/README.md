# Y.js Document Comment Storage Options

## Executive Summary

The core challenge in storing comments with Y.js is the mismatch between document-level permissions (which Y.js supports) and the need for type-level permissions (for comments). This document explores four approaches to address this, varying in complexity, security, real-time capabilities, and implementation status. The main trade-offs revolve around whether comments are stored within the same YDoc as the content or externally, and whether a central server is used for authorization.

There are several options for storing comments in a Y.js Document (YDoc), each with its own set of trade-offs. These options can be broadly categorized as either [storing comments within the same YDoc](#comments-within-the-ydoc) as the editor content or [storing them externally](#comments-outside-of-the-ydoc). Let's explore the trade-offs between these approaches to help determine the best fit for your use case.

Note: Some approaches offered in this document may not have been implemented yet, so, if you are interested in sponsoring the implementation, please reach out to us at [team@blocknotejs.org](mailto:team@blocknotejs.org).

## Comments Within the YDoc

![Comments within the YDoc](./images/comments-within-ydoc.excalidraw.svg)

One approach is to store the comments directly into the same YDoc which holds the content itself. A key challenge with this approach is that Y.js only supports permissions on the document level (whereas this would be at the Y.js type level). This means that if a user had read access to the document, they could __read any comments__ made on the document, and if they had edit permissions to the document, they could __modify any comments__ made on the document.

Luckily, there are some mitigations and workarounds to make this more secure, with its own set of trade-offs. This is discussed further in [the REST approach](#2-comments-in-the-ydoc-with-a-central-rest-server).

- __Pros__
  - Simple implementation that is well understood
- __Cons__
  - Permissions may have some trade-offs that are unacceptable by certain applications

## Comments Outside of the YDoc

![Comments outside of the YDoc](./images/comments-outside-ydoc.excalidraw.svg)

Another approach would be to store comments in a separate data store which could be authorized separately from the editor content. The main trade-off of this approach is the complexity of its implementation, and the uncertainty around how to actually implement it (since it has yet to be built). Note that this approach requires a separate synchronization mechanism since comments won't automatically sync with the main document's Y.js provider.

There are some recommendations on approaches to this implementation, but they have yet to be implemented, so take them with a grain of salt.

- __Pros__
  - Authorization can be separated easily
- __Cons__
  - Not implemented in practice
  - Likely requires changes to BlockNote commenting to be supported
  - Requires a separate synchronization mechanism

## Implementation Approaches

This table summarizes the trade-offs between the different available approaches.

| Approach                                                                                                                 | Simplicity | Real-time | Comment-only user securely | View-only user securely | Centralized | Implemented |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- | --------- | -------------------------- | ----------------------- | ----------- | ----------- |
| [Comments stored in YDoc, without a central REST server](#1-comments-in-the-ydoc-without-a-central-rest-server)          | 1          | ✅         | ❌                          | ❌                       | ❌           | ✅           |
| [Comments stored in YDoc, with a central REST server](#2-comments-in-the-ydoc-with-a-central-rest-server)                | 2          | ✅         | ✅                          | ❌                       | ✅           | ✅           |
| [Comments stored separately, with a central REST server](#3-comments-stored-separately-with-a-central-rest-server)       | 3          | ❌*        | ✅                          | ✅                       | ✅           | ❌           |
| [Comments stored separately, without a central REST server](#4-comments-stored-separately-without-a-central-rest-server) | 4          | ❌*        | ✅                          | ✅                       | ❌           | ❌           |

Note: The "❌*" indicates that this approach does not have real-time sync "for free", and may require a separate connection to the server to sync the comments.

### 1. Comments in the YDoc, Without a Central REST Server

This is the simplest implementation, but at the trade-off of being the least secure. This involves storing all of the comment data directly in the same YDoc as the editor content. This would allow anyone who has permissions to modify the YDoc to be able to modify any content and comments within the document. This can be an acceptable trade-off if your use-case does not require a comment-only user, or if viewing the comments of a document is not sensitive.

- __Pros__
  - Simplest approach
- __Cons__
  - Permissions issues

This is approach is implemented by the [YJS ThreadStore](https://www.blocknotejs.org/docs/collaboration/comments#yjsthreadstore)

### 2. Comments in the YDoc, With a Central REST Server

To address the permission issues of the simplest approach while keeping comments within the YDoc, we can introduce a central server. This approach is a slight modification to the [Comments in the document, without a central REST server](#1-comments-in-the-ydoc-without-a-central-rest-server) approach. It essentially tries to make Y.js enforce permissions on the type-level even though it is not actually supported. The centralized server becomes the only entity which is able to edit the comments that are stored within the document. If any tampering is detected, it can be immediately rolled back by the synchronization server to ensure security and authenticity of the content.

This comes at the trade-off of requiring both the synchronization server and the REST server to see & modify the content in plain-text (to inspect that the updates are actually authentic and authorized). As well as not being local-first, since it would require connection to the server to actually apply the comment to the YDoc.

- __Pros__
  - Simple approach
  - Allows comment-only users to make comments securely
- __Cons__
  - Anybody with read access to the YDoc can read comments
  - Requires a trusted central server to make all comment modifications (i.e. not local-first, p2p, etc.)

This approach is implemented by the [REST Yjs ThreadStore](https://www.blocknotejs.org/docs/collaboration/comments#restyjsthreadstore), but for security, it is recommended to also use the [Reject Unauthorized Extension for Hocuspocus](https://github.com/TypeCellOS/BlockNote-demo-nextjs-hocuspocus/pull/4) to ensure that the server is the only entity which can modify the comments.

### 3. Comments Stored Separately, With a Central REST Server

For scenarios requiring strict separation between document content and comments, we can move comments to a separate store. Using a similar approach to [Comments in the document, with a central REST server](#2-comments-in-the-ydoc-with-a-central-rest-server), the idea would be to use the REST server for users who have comment-only permissions to the document. The REST server would apply the marks, references, etc. to the document for the user, since they don't have permissions to modify the document.

- __Pros__
  - Authorization can be separated easily
- __Cons__
  - More complex to implement than having the comments in the document
  - Comments are not synced immediately, may need a separate connection if syncing with a Y.js provider
  - Not yet implemented
  - Requires a trusted central server to make all comment modifications (i.e. not local-first, p2p, etc.)

This approach is not yet implemented, but is a good approach if you want to have a view-only user without access to the document content. If you are interested in sponsoring the implementation, please reach out to us at [team@blocknotejs.org](mailto:team@blocknotejs.org).

### 4. Comments Stored Separately, Without a Central REST Server

For maximum decentralization while maintaining separate permissions, we can use two YDocs. This approach would leverage two YDocs, one for the document content, and another for comments on that document. This would require a new implementation of BlockNote comments to not have to modify the document content in any way to make a comment on it.

Likely, the most robust way would be, for the comment to store the relative position of the comment in the document, and use that to reference the document content. In addition to this, it likely would be prudent to also store the block identifier of the comment as a fallback in case that text has been removed from the document.

To make sure that the comments are authenticated and authorized (e.g. for a possible impersonation situation), it would either require:

- the sync server to reject updates, as described in the "Comments in the document, with a central REST server" approach. Which means the sync server can see the content in plain-text.
- cryptographic signing of comment content to ensure no tampering, and an external system for distributing public keys. Which reduces Y.js to a transport mechanism rather than leveraging its CRDT properties

- __Pros__
  - Does not require a central server to make comments
- __Cons__
  - Requires a new implementation of BlockNote comments to not modify the document content
  - Complex to implement, and not yet implemented

This approach is not yet implemented, but is a good approach if you want to have the server not modify the document content. If you are interested in sponsoring the implementation, please reach out to us at [team@blocknotejs.org](mailto:team@blocknotejs.org).

## Choosing an Approach

Here's a quick guide to help you choose the most suitable approach based on your requirements:

- __If simplicity is the priority and granular permissions aren't critical:__
  - Use [Approach 1 (Comments in YDoc, no central server)](https://www.blocknotejs.org/docs/collaboration/comments#1-comments-in-the-ydoc-without-a-central-rest-server)
  - Best for internal tools or non-sensitive content

- __If you need comment-only users but can accept server dependency:__
  - Use [Approach 2 (Comments in YDoc, with central server)](https://www.blocknotejs.org/docs/collaboration/comments#2-comments-in-the-ydoc-with-a-central-rest-server)
  - Good for most business applications where server trust is acceptable

- __If you need strict separation between content and comments:__
  - Use [Approach 3 (Comments separate, with central server)](https://www.blocknotejs.org/docs/collaboration/comments#3-comments-stored-separately-with-a-central-rest-server)
  - Ideal for scenarios where document content needs to be protected from commenters

- __If you need maximum decentralization and separate permissions:__
  - Use [Approach 4 (Comments separate, no central server)](https://www.blocknotejs.org/docs/collaboration/comments#4-comments-stored-separately-without-a-central-rest-server)
  - Best for peer-to-peer applications where server trust is not desired

Remember that Approaches 3 and 4 are not yet implemented, so if you need these capabilities, you'll need to sponsor their development or implement them yourself.
