import { afterEach, describe, expect, vi } from "vite-plus/test";
import { ySyncPluginKey, yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import {
  Extension as TiptapExtension,
  InputRule as TiptapInputRule,
} from "@tiptap/core";
import { TextSelection } from "prosemirror-state";
import { Node as TiptapNode } from "@tiptap/core";
import { CommentMark } from "../comments/mark.js";
import { createExtension, type InputRule } from "./BlockNoteExtension.js";
import {
  BlockNoteEditor,
  type BlockNoteEditorOptions,
} from "./BlockNoteEditor.js";
import type {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../blocks/defaultBlocks.js";
import { createInputRulesPlugins, hasInputRule } from "./inputRules.js";
import { installHeadlessPlugins } from "../extensions/testHeadlessEditor.js";
import { withCollaboration } from "../yjs/index.js";
import { blocksToYXmlFragment } from "../yjs/utils.js";

afterEach(() => {
  vi.restoreAllMocks();
});

type CreateEditor = (
  options?: Omit<
    Partial<
      BlockNoteEditorOptions<
        DefaultBlockSchema,
        DefaultInlineContentSchema,
        DefaultStyleSchema
      >
    >,
    "schema"
  >,
) => Promise<BlockNoteEditor>;

async function setupCollaborativeEditor(
  createEditor: CreateEditor,
  onCleanup: (cleanup: () => void) => void,
) {
  const doc = new Y.Doc();
  onCleanup(() => doc.destroy());
  const fragment = doc.getXmlFragment("document");
  const editor = await createEditor(
    withCollaboration<NonNullable<Parameters<CreateEditor>[0]>>({
      collaboration: {
        fragment,
        user: { name: "Test", color: "red" },
        provider: undefined,
      },
    }),
  );
  blocksToYXmlFragment(editor, editor.document, fragment);
  const view = editor.prosemirrorView;
  // Drive only Yjs's sync view lifecycle. It needs state/dispatch and an
  // unfocused view, not DOM rendering, cursor geometry, or awareness UI.
  const syncView = new Proxy(view, {
    get(target, key) {
      return key === "hasFocus" ? () => false : Reflect.get(target, key);
    },
  });
  const sync = view.state.plugins.find(
    (plugin) => plugin.spec.key === ySyncPluginKey,
  );
  const syncPluginView = sync?.spec.view?.(syncView);
  if (!syncPluginView) {
    throw new Error("Missing Yjs sync plugin");
  }
  onCleanup(() => syncPluginView.destroy?.());
  const updateSync = () => syncPluginView.update?.(syncView, view.state);
  editor._tiptapEditor.on("transaction", updateSync);
  onCleanup(() => editor._tiptapEditor.off("transaction", updateSync));
  const undo = yUndoPluginKey.getState(view.state)?.undoManager;
  if (!undo) {
    throw new Error("Missing Yjs undo manager");
  }
  undo.clear();
  undo.stopCapturing();
  return editor;
}

function keyDown(
  editor: BlockNoteEditor,
  key: string,
  modifiers: Partial<KeyboardEvent> = {},
) {
  // Only the key fields are read by ProseMirror's keymaps; no DOM is involved.
  const event = {
    key,
    keyCode: key === "Backspace" ? 8 : 13,
    ...modifiers,
  } as KeyboardEvent;
  const view = editor.prosemirrorView;
  return view.state.plugins.some((plugin) =>
    plugin.props.handleKeyDown?.call(plugin, view, event),
  );
}

function typeText(editor: BlockNoteEditor, text: string) {
  const view = editor.prosemirrorView;
  for (const char of text) {
    const { from, to } = view.state.selection;
    const insert = () => view.state.tr.insertText(char, from, to);
    const handled = view.state.plugins.some((plugin) =>
      plugin.props.handleTextInput?.call(plugin, view, from, to, char, insert),
    );
    if (!handled) {
      view.dispatch(insert());
    }
  }
}

describe("input-rule history", () => {
  const it = globalThis.it.extend<{
    createEditor: CreateEditor;
    createCollaborativeEditor: () => Promise<BlockNoteEditor>;
  }>({
    createEditor: async ({ setupEditor }, use) => {
      await use(async (options) => {
        const { editor } = await setupEditor({
          initialContent: [{ id: "paragraph", type: "paragraph", content: [] }],
          ...options,
        });
        installHeadlessPlugins(editor);
        return editor;
      });
    },
    createCollaborativeEditor: async (
      { createEditor, onTestFinished },
      use,
    ) => {
      await use(() => setupCollaborativeEditor(createEditor, onTestFinished));
    },
  });

  describe.each(["standalone", "yjs"] as const)("%s history", (backend) => {
    it.for([
      ["*ab*", "italic"],
      ["_ab_", "italic"],
      ["**ab**", "bold"],
      ["__ab__", "bold"],
      ["~~ab~~", "strike"],
      ["`ab`", "code"],
    ] as const)(
      "records the literal %s before conversion",
      async ([text, style], { createEditor, createCollaborativeEditor }) => {
        const editor = await (backend === "yjs"
          ? createCollaborativeEditor()
          : createEditor());
        // All typing and conversion happen inside one capture window. Separation
        // must come from closeHistory, not incidental test execution time.
        vi.spyOn(Date, "now").mockReturnValue(Date.now());
        typeText(editor, text);
        expect(editor.document[0].content).toEqual([
          { type: "text", text: "ab", styles: { [style]: true } },
        ]);

        expect(editor.undo()).toBe(true);
        expect(editor.document[0].content).toEqual([
          { type: "text", text, styles: {} },
        ]);

        expect(editor.redo()).toBe(true);
        expect(editor.document[0].content).toEqual([
          { type: "text", text: "ab", styles: { [style]: true } },
        ]);
      },
    );
  });

  it.for([
    "*ab*",
    "**ab**",
    "~~ab~~",
    "`ab`",
    "# ",
    "- ",
    "3. ",
    "[x] ",
    "> ",
    "``` ",
    "---",
  ])(
    "Backspace reverses %s without duplicating its trigger",
    async (text, { createEditor }) => {
      const editor = await createEditor();
      typeText(editor, text);
      expect(keyDown(editor, "Backspace")).toBe(true);
      expect(editor.document[0].type).toBe("paragraph");
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: {} },
      ]);
      // The conversion metadata must be consumed by this document change.
      typeText(editor, "x");
      expect(editor.document[0].content).toEqual([
        { type: "text", text: text + "x", styles: {} },
      ]);
    },
  );

  it.for(["standalone", "yjs"])(
    "Backspace uses %s history so the conversion can be redone",
    async (history, { createEditor, createCollaborativeEditor }) => {
      const editor = await (history === "yjs"
        ? createCollaborativeEditor()
        : createEditor());
      typeText(editor, "**ab**");
      const converted = editor.document;
      expect(keyDown(editor, "Backspace")).toBe(true);
      expect(editor.prosemirrorState.doc.textContent).toBe("**ab**");
      expect(editor.redo()).toBe(true);
      expect(editor.document).toEqual(converted);
    },
  );

  it("does not run inline rules on plain Enter", async ({ createEditor }) => {
    const editor = await createEditor();
    typeText(editor, "inline");
    const [input, sidecar] = createInputRulesPlugins(
      [{ find: /inline\s$/, replace: () => "converted" }],
      editor,
    );
    const view = editor.prosemirrorView;
    view.updateState(view.state.reconfigure({ plugins: [input, sidecar] }));
    expect(keyDown(editor, "Enter")).toBe(false);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "inline", styles: {} },
    ]);
  });

  it("converts a block on Enter and keeps the cursor inside it", async ({
    createEditor,
  }) => {
    const editor = await createEditor();
    typeText(editor, "```ts");
    expect(keyDown(editor, "Enter")).toBe(true);
    expect(editor.document[0]).toMatchObject({
      type: "codeBlock",
      content: [],
      props: { language: "ts" },
    });
    typeText(editor, "code");
    expect(editor.prosemirrorState.doc.textContent).toBe("code");
  });

  it("does not undo a stale conversion after the selection moves", async ({
    createEditor,
  }) => {
    const editor = await createEditor();
    typeText(editor, "**ab**");
    const view = editor.prosemirrorView;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, view.state.selection.from - 1),
      ),
    );
    expect(hasInputRule(view.state)).toBe(false);
    expect(editor.undo()).toBe(true);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "**ab**", styles: {} },
    ]);
  });

  it.for(["**ab**", "---"])(
    "Backspace reverses %s immediately with Yjs",
    async (text, { createCollaborativeEditor }) => {
      const editor = await createCollaborativeEditor();
      typeText(editor, text);
      expect(keyDown(editor, "Backspace")).toBe(true);
      expect(editor.document[0].type).toBe("paragraph");
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: {} },
      ]);
    },
  );

  it("preserves custom Tiptap input rules and their Backspace undo", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      _tiptapOptions: {
        extensions: [
          TiptapExtension.create({
            name: "arrowConversion",
            addInputRules() {
              return [
                new TiptapInputRule({
                  find: /->$/,
                  handler: ({ state, range }) => {
                    state.tr.insertText("→", range.from, range.to);
                  },
                }),
              ];
            },
          }),
        ],
      },
    });
    typeText(editor, "->");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "→", styles: {} },
    ]);
    expect(keyDown(editor, "Backspace")).toBe(true);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "->", styles: {} },
    ]);
  });

  it("orders custom rules by priority and falls through declined matches", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      extensions: [
        createExtension({
          key: "low",
          inputRules: [{ find: /->$/, replace: () => "low" }],
        }),
        createExtension({
          key: "high",
          runsBefore: ["low"],
          inputRules: [
            { find: /->$/, replace: () => undefined },
            { find: /->$/, replace: () => "→" },
          ],
        }),
      ],
    });
    typeText(editor, "->");
    expect(editor.prosemirrorState.doc.textContent).toBe("→");
    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("->");
  });

  it("applies declarative styles without discarding existing formatting", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      extensions: [
        createExtension({
          key: "custom-style",
          inputRules: [
            {
              find: /!(ab)!$/,
              replace: ({ match }) => ({
                text: match[1],
                styles: { bold: true, textColor: "red" },
              }),
            },
          ],
        }),
      ],
    });
    editor.addStyles({ italic: true });
    typeText(editor, "!ab!");
    expect(editor.document[0].content).toEqual([
      {
        type: "text",
        text: "ab",
        styles: { italic: true, bold: true, textColor: "red" },
      },
    ]);
    expect(keyDown(editor, "Backspace")).toBe(true);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "!ab!", styles: { italic: true } },
    ]);
  });

  it.for([" foo", "  "])(
    "retains whitespace when applying styles to %j",
    async (text, { createEditor }) => {
      const editor = await createEditor({
        extensions: [
          createExtension({
            key: "whitespace-style",
            inputRules: [
              {
                find: /(?: foo| {2})$/,
                replace: ({ match }) => ({
                  text: match[0],
                  styles: { bold: true },
                }),
              },
            ],
          }),
        ],
      });
      typeText(editor, text);
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: { bold: true } },
      ]);
      expect(keyDown(editor, "Backspace")).toBe(true);
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: {} },
      ]);
    },
  );

  it("preserves preceding formatting when a space triggers inline code", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      initialContent: [
        {
          id: "paragraph",
          type: "paragraph",
          content: [
            { type: "text", text: "(", styles: { bold: true } },
            { type: "text", text: "`ab`", styles: {} },
          ],
        },
      ],
    });
    editor.setTextCursorPosition("paragraph", "end");
    typeText(editor, " ");
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "(", styles: { bold: true } },
      { type: "text", text: "ab", styles: { code: true } },
      { type: "text", text: " ", styles: {} },
    ]);
    expect(keyDown(editor, "Backspace")).toBe(true);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "(", styles: { bold: true } },
      { type: "text", text: "`ab` ", styles: {} },
    ]);
  });

  it("preserves comment annotations when a space triggers inline code", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      initialContent: [{ id: "paragraph", type: "paragraph", content: "`ab`" }],
      _tiptapOptions: { extensions: [CommentMark] },
    });
    const view = editor.prosemirrorView;
    const comment = view.state.schema.marks.comment.create({
      threadId: "thread",
    });
    view.dispatch(view.state.tr.addMark(4, 6, comment));
    editor.setTextCursorPosition("paragraph", "end");
    typeText(editor, " ");
    expect(view.state.doc.textContent).toBe("ab ");
    expect(view.state.doc.rangeHasMark(3, 5, comment)).toBe(true);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "ab", styles: { code: true } },
      { type: "text", text: " ", styles: {} },
    ]);
    expect(keyDown(editor, "Backspace")).toBe(true);
    expect(view.state.doc.textContent).toBe("`ab` ");
    expect(view.state.doc.rangeHasMark(4, 6, comment)).toBe(true);
  });

  it("declines inline nodes that do not fit the current textblock", async ({
    createEditor,
  }) => {
    const editor = await createEditor({
      _tiptapOptions: {
        extensions: [
          TiptapNode.create({
            name: "plainText",
            group: "blockContent",
            content: "text*",
          }),
        ],
      },
      extensions: [
        createExtension({
          key: "incompatible-inline",
          inputRules: [{ find: /->$/, replace: () => "\n" }],
        }),
      ],
    });
    const view = editor.prosemirrorView;
    view.dispatch(
      view.state.tr.setNodeMarkup(2, view.state.schema.nodes.plainText),
    );
    typeText(editor, "->");
    expect(view.state.doc.textContent).toBe("->");
    expect(view.state.doc.nodeAt(2)?.type.name).toBe("plainText");
  });

  it("keeps the original block rule callback contract", async ({
    createEditor,
  }) => {
    const replace = vi.fn<InputRule["replace"]>(({ editor, match, range }) => {
      expect(editor).toBeInstanceOf(BlockNoteEditor);
      expect(match[0]).toBe("! ");
      expect(range.to - range.from).toBe(2);
      return { type: "heading", props: { level: 2 } };
    });
    const editor = await createEditor({
      extensions: [
        createExtension({
          key: "simple-block-rule",
          inputRules: [{ find: /^!\s$/, replace }],
        }),
      ],
    });
    typeText(editor, "! ");
    expect(replace).toHaveBeenCalledOnce();
    expect(editor.document[0]).toMatchObject({
      type: "heading",
      props: { level: 2 },
    });
    expect(keyDown(editor, "Backspace")).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("! ");
  });

  it.for(["*ab*", "**ab**", "~~ab~~"])(
    "does not format %s inside code",
    async (text, { createEditor }) => {
      const editor = await createEditor();
      editor.addStyles({ code: true });
      typeText(editor, text);
      expect(editor.document[0].content).toEqual([
        { type: "text", text, styles: { code: true } },
      ]);
    },
  );
});
