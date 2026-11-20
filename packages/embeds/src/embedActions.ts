import type { BlockNoteEditor, Store } from "@blocknote/core";
import { blockNode, type DocumentNode, type EmbedState } from "./embedState.js";
import type { EmbedsBlockSchema, EmbedsOptions } from "./types.js";
import { parseSourceUrl } from "./url.js";

export type Representation = "url" | "bookmark" | "embed";
export type EmbedOutcome = {
  status: "converted" | "url-only" | "unchanged" | "unavailable" | "cancelled";
};

/** The single conversion/request owner; the extension coordinates its mounted lifetime. */
export function createEmbedActions(
  editor: BlockNoteEditor<EmbedsBlockSchema>,
  options: EmbedsOptions,
  store: Store<EmbedState>,
) {
  let pending:
    | { controller: AbortController; blockId: string; node: DocumentNode }
    | undefined;
  function prepare(url: string, targetBlockId?: string) {
    pending?.controller.abort();
    store.setState({ ...store.state, candidate: undefined });
    const id = targetBlockId ?? editor.getTextCursorPosition().block.id;
    const block = editor.getBlock(id);
    const source = parseSourceUrl(url);
    if (!editor.isEditable || !block || !source) {
      return undefined;
    }
    return { id, block, source };
  }
  function insertUrl(url: string, targetBlockId?: string): EmbedOutcome {
    const target = prepare(url, targetBlockId);
    if (!target) {
      return { status: "unavailable" };
    }
    if (
      target.block.type === "paragraph" &&
      target.block.content.length === 1 &&
      target.block.content[0].type === "link" &&
      target.block.content[0].href === url &&
      target.block.content[0].content.map((part) => part.text).join("") === url
    ) {
      return { status: "unchanged" };
    }
    editor.updateBlock(target.id, {
      type: "paragraph",
      content: [
        {
          type: "link",
          href: url,
          content: [{ type: "text", text: url, styles: {} }],
        },
      ],
    });
    editor.setTextCursorPosition(target.id, "end");
    editor.focus();
    return { status: "converted" };
  }
  function insertEmbed(url: string, targetBlockId?: string): EmbedOutcome {
    const target = prepare(url, targetBlockId);
    if (!target) {
      return { status: "unavailable" };
    }
    const provider = options.providers.find((value) =>
      value.matches(target.source),
    );
    if (!provider) {
      return { status: "unavailable" };
    }
    if (
      target.block.type === "embed" &&
      target.block.props.originalUrl === url &&
      target.block.props.providerId === provider.id
    ) {
      return { status: "unchanged" };
    }
    editor.updateBlock(target.id, {
      type: "embed",
      props: { originalUrl: url, providerId: provider.id },
    });
    return { status: "converted" };
  }
  async function insertBookmark(
    url: string,
    targetBlockId?: string,
  ): Promise<EmbedOutcome> {
    const target = prepare(url, targetBlockId);
    if (!target) {
      return { status: "unavailable" };
    }
    if (
      target.block.type === "bookmark" &&
      target.block.props.originalUrl === url
    ) {
      return { status: "unchanged" };
    }
    const node = blockNode(editor.prosemirrorState.doc, target.id);
    if (!node) {
      return { status: "unavailable" };
    }
    const controller = new AbortController();
    const request = { controller, blockId: target.id, node };
    pending = request;
    store.setState({
      ...store.state,
      pending: target.id,
      announcement: undefined,
    });
    function clear() {
      if (pending === request) {
        pending = undefined;
        store.setState({ ...store.state, pending: undefined });
      }
    }
    controller.signal.addEventListener("abort", clear, { once: true });
    try {
      const result = options.resolveMetadata
        ? await options.resolveMetadata(url, { signal: controller.signal })
        : { status: "unavailable" as const };
      if (
        controller.signal.aborted ||
        !editor.isEditable ||
        !blockNode(editor.prosemirrorState.doc, target.id)?.eq(node)
      ) {
        return { status: "cancelled" };
      }
      clear();
      const metadata = result.status === "success" ? result.value : {};
      const imageUrl =
        metadata.imageUrl && parseSourceUrl(metadata.imageUrl)
          ? metadata.imageUrl
          : "";
      editor.updateBlock(target.id, {
        type: "bookmark",
        props: {
          originalUrl: url,
          title: metadata.title ?? "",
          description: metadata.description ?? "",
          imageUrl,
        },
      });
      if (!metadata.title && !metadata.description && !imageUrl) {
        store.setState({
          ...store.state,
          announcement: {
            blockId: target.id,
            text: "Bookmark created without a preview.",
          },
        });
        return { status: "url-only" };
      }
      return { status: "converted" };
    } finally {
      controller.signal.removeEventListener("abort", clear);
      clear();
    }
  }
  return {
    insertBookmark,
    insertEmbed,
    insertUrl,
    // Read-only access to the actual request, not another copy of pending ownership.
    get pending() {
      return pending;
    },
  };
}
