import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import "@mantine/core/styles.css";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockPopover,
  useCreateBlockNote,
  useEditorState,
} from "@blocknote/react";
import {
  ActionIcon,
  Button,
  Group,
  Kbd,
  MantineContext,
  MantineProvider,
  Menu,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import {
  type KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { MdDragIndicator } from "react-icons/md";

function copyBlock(block: Block): PartialBlock {
  return {
    ...block,
    id: undefined,
    children: block.children.map(copyBlock),
  };
}

type Action = "add" | "duplicate" | "delete";

function KeyboardBlockMenu({
  editor,
  blockId,
  onClose,
}: {
  editor: BlockNoteEditor;
  blockId: string;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // A collaborative edit may remove the context while the menu is open.
  useEffect(
    () =>
      editor.onChange(() => {
        if (editor.getBlock(blockId)) {
          return;
        }
        const hadFocus = menuRef.current?.contains(
          menuRef.current.ownerDocument.activeElement,
        );
        onClose(hadFocus);
      }),
    [editor, blockId, onClose],
  );

  function closeAndFocusEditor() {
    onClose(true);
  }

  function runAction(action: Action) {
    const block = editor.getBlock(blockId);
    if (!block || !editor.isEditable) {
      closeAndFocusEditor();
      return;
    }
    if (action === "delete") {
      const { nextBlock, prevBlock } = editor.getTextCursorPosition();
      editor.removeBlocks([block]);
      const neighbor = nextBlock ?? prevBlock ?? editor.document[0];
      if (neighbor && editor.getBlock(neighbor.id)) {
        editor.setTextCursorPosition(neighbor, "start");
      }
    } else {
      const [inserted] = editor.insertBlocks(
        [action === "duplicate" ? copyBlock(block) : { type: "paragraph" }],
        block,
        "after",
      );
      editor.setTextCursorPosition(inserted, "start");
    }
    closeAndFocusEditor();
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape" && event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    closeAndFocusEditor();
  }

  return (
    <BlockPopover
      blockId={blockId}
      useFloatingOptions={{ open: true, placement: "left-start" }}
      useDismissProps={{ enabled: false }}
      focusManagerProps={{ disabled: true }}
      useTransitionStylesProps={{ duration: 0 }}
    >
      <Menu
        opened
        onChange={(opened) => {
          if (!opened) {
            onClose();
          }
        }}
        returnFocus={false}
        closeOnEscape={false}
        withInitialFocusPlaceholder={false}
        withinPortal={false}
        position="bottom-start"
        transitionProps={{ duration: 0 }}
      >
        <Menu.Target>
          <ActionIcon aria-label="Block actions" variant="subtle" color="gray">
            <MdDragIndicator size={24} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown
          ref={menuRef}
          aria-label="Block actions"
          className="bn-menu-dropdown bn-drag-handle-menu"
          onKeyDownCapture={handleMenuKeyDown}
        >
          <Menu.Label>Current block</Menu.Label>
          <Menu.Item
            data-autofocus
            className="bn-menu-item mantine-focus-always"
            onClick={() => runAction("add")}
          >
            Add paragraph below
          </Menu.Item>
          <Menu.Item
            className="bn-menu-item mantine-focus-always"
            onClick={() => runAction("duplicate")}
          >
            Duplicate block
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            className="bn-menu-item mantine-focus-always"
            onClick={() => runAction("delete")}
          >
            Delete block
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </BlockPopover>
  );
}

function KeyboardBlockActions() {
  const [blockId, setBlockId] = useState<string>();
  const [isReadOnly, setReadOnly] = useState(false);
  const shouldRestoreFocus = useRef(false);
  const editor = useCreateBlockNote({
    initialContent: [
      {
        id: "intro",
        type: "heading",
        props: { level: 2 },
        content: "Keyboard block actions",
      },
      {
        id: "paragraph",
        type: "paragraph",
        content:
          "Keep your caret here. Open the menu, press Escape, and continue writing.",
      },
      {
        id: "parent",
        type: "bulletListItem",
        content: "A block with a child",
        children: [
          {
            id: "child",
            type: "bulletListItem",
            content: "Try the shortcut in this nested block.",
          },
        ],
      },
      {
        id: "last",
        type: "paragraph",
        content: "Tab still indents. Undo still restores deleted content.",
      },
    ],
  });
  const hasMultipleBlocks = useEditorState({
    editor,
    on: "selection",
    selector: ({ editor }) => (editor.getSelection()?.blocks.length ?? 0) > 1,
  });

  // Restore only after the menu's focus trap has unmounted, so it cannot
  // move focus away from the editor during its own cleanup.
  useEffect(() => {
    if (blockId || !shouldRestoreFocus.current) {
      return;
    }
    shouldRestoreFocus.current = false;
    editor.focus();
  }, [blockId, editor]);

  function closeMenu(restoreFocus = false) {
    shouldRestoreFocus.current ||= restoreFocus;
    setBlockId(undefined);
  }

  function openMenu() {
    if (!editor.isEditable || (editor.getSelection()?.blocks.length ?? 0) > 1) {
      return;
    }
    shouldRestoreFocus.current = false;
    setBlockId(editor.getTextCursorPosition().block.id);
  }

  function handleEditorKeyDown(event: KeyboardEvent) {
    const isShortcut =
      event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
    if (
      !isShortcut ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing ||
      !editor.isEditable ||
      !(event.target instanceof Node) ||
      !editor.domElement?.contains(event.target) ||
      (editor.getSelection()?.blocks.length ?? 0) > 1
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openMenu();
  }

  return (
    <Stack gap="md" p="xl">
      <Group justify="space-between" gap="md">
        <Text size="sm">
          Open block actions with <Kbd>Shift</Kbd> + <Kbd>F10</Kbd>. Escape
          returns to writing.
        </Text>
        <Switch
          label="Read-only"
          checked={isReadOnly}
          onChange={(event) => {
            setBlockId(undefined);
            setReadOnly(event.currentTarget.checked);
          }}
        />
      </Group>
      <Group>
        <Button
          variant="default"
          size="compact-sm"
          disabled={isReadOnly || hasMultipleBlocks}
          onClick={openMenu}
        >
          Block actions
        </Button>
        <Text size="sm" role="status">
          {hasMultipleBlocks
            ? "Select a single block to open its actions."
            : "Actions apply to the block at your caret."}
        </Text>
      </Group>
      <BlockNoteView
        editor={editor}
        editable={!isReadOnly}
        sideMenu={!blockId}
        onKeyDownCapture={handleEditorKeyDown}
      >
        {blockId && (
          <KeyboardBlockMenu
            editor={editor}
            blockId={blockId}
            onClose={closeMenu}
          />
        )}
      </BlockNoteView>
    </Stack>
  );
}

export default function App() {
  const mantineContext = useContext(MantineContext);
  const example = <KeyboardBlockActions />;

  // The playground supplies this context; a standalone example does not.
  if (mantineContext) {
    return example;
  }

  return <MantineProvider defaultColorScheme="auto">{example}</MantineProvider>;
}
