import * as Y from "yjs";
import { CommentBody } from "../../types.js";
import { ThreadStoreAuth } from "../ThreadStoreAuth.js";
import { YjsThreadStoreBase } from "./YjsThreadStoreBase.js";

/**
 * This is a REST-based implementation of the YjsThreadStoreBase.
 * It Reads data directly from the underlying document (same as YjsThreadStore),
 * but for Writes, it sends data to a REST API that should:
 * - check the user has the correct permissions to make the desired changes
 * - apply the updates to the underlying Yjs document
 *
 * (see https://github.com/TypeCellOS/BlockNote-demo-nextjs-hocuspocus)
 *
 * The reason we still use the Yjs document as underlying storage is that it makes it easy to
 * sync updates in real-time to other collaborators.
 * (but technically, you could also implement a different storage altogether
 * and not store the thread related data in the Yjs document)
 */
export class RESTYjsThreadStore extends YjsThreadStoreBase {
  constructor(
    private readonly BASE_URL: string,
    private readonly headers: Record<string, string>,
    threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(threadsYMap, auth);
  }

  private doRequest = async (path: string, method: string, body?: any) => {
    const response = await fetch(`${this.BASE_URL}${path}`, {
      method,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to ${method} ${path}: ${response.statusText}`);
    }

    return response.json();
  };

  public addThreadToDocument = async (options: {
    threadId: string;
    selection: {
      prosemirror: {
        head: number;
        anchor: number;
      };
      yjs: {
        head: any;
        anchor: any;
      };
    };
  }) => {
    const { threadId, ...rest } = options;
    return this.doRequest(`/${threadId}/addToDocument`, "POST", rest);
  };

  public createThread = async (options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }) => {
    return this.doRequest("", "POST", options);
  };

  public addComment = (options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
  }) => {
    const { threadId, ...rest } = options;
    return this.doRequest(`/${threadId}/comments`, "POST", rest);
  };

  public updateComment = (options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
    commentId: string;
  }) => {
    const { threadId, commentId, ...rest } = options;
    return this.doRequest(`/${threadId}/comments/${commentId}`, "PUT", rest);
  };

  public deleteComment = (options: {
    threadId: string;
    commentId: string;
    softDelete?: boolean;
  }) => {
    const { threadId, commentId, ...rest } = options;
    return this.doRequest(
      `/${threadId}/comments/${commentId}?soft=${!!rest.softDelete}`,
      "DELETE",
    );
  };

  public deleteThread = (options: { threadId: string }) => {
    return this.doRequest(`/${options.threadId}`, "DELETE");
  };

  public resolveThread = (options: { threadId: string }) => {
    return this.doRequest(`/${options.threadId}/resolve`, "POST");
  };

  public unresolveThread = (options: { threadId: string }) => {
    return this.doRequest(`/${options.threadId}/unresolve`, "POST");
  };

  public addReaction = (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) => {
    const { threadId, commentId, ...rest } = options;
    return this.doRequest(
      `/${threadId}/comments/${commentId}/reactions`,
      "POST",
      rest,
    );
  };

  public deleteReaction = (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) => {
    return this.doRequest(
      `/${options.threadId}/comments/${options.commentId}/reactions/${options.emoji}`,
      "DELETE",
    );
  };
}
