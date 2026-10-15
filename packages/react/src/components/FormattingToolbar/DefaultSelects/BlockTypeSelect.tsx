import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockTypeItem,
  editorHasBlockWithType,
  getDefaultBlockTypeItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useMemo } from "react";
import type { IconType } from "../../../icons.js";
import {
  RiH1,
  RiH2,
  RiH3,
  RiH4,
  RiH5,
  RiH6,
  RiListCheck3,
  RiListOrdered,
  RiListUnordered,
  RiPlayList2Fill,
  RiQuoteText,
  RiText,
} from "react-icons/ri";

import {
  ComponentProps,
  useComponentsContext,
} from "../../../editor/ComponentsContext.js";
import { usePortalElement } from "../../../editor/PortalElementOverride.js";
import { useUIMode } from "../../../editor/UIModeContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
};

const icons: Record<DefaultBlockTypeItem["key"], IconType> = {
  paragraph: RiText,
  heading: RiH1,
  heading_2: RiH2,
  heading_3: RiH3,
  heading_4: RiH4,
  heading_5: RiH5,
  heading_6: RiH6,
  toggle_heading: RiH1,
  toggle_heading_2: RiH2,
  toggle_heading_3: RiH3,
  quote: RiQuoteText,
  toggle_list: RiPlayList2Fill,
  bullet_list: RiListUnordered,
  numbered_list: RiListOrdered,
  check_list: RiListCheck3,
};

/**
 * The default block type select items: the block types of the editor's schema
 * that the default menus offer (see `getDefaultBlockTypeItems`).
 */
export const blockTypeSelectItems = (
  editor: BlockNoteEditor<any, any, any>,
): BlockTypeSelectItem[] =>
  getDefaultBlockTypeItems(editor).map(({ key, type, props }) => ({
    name: editor.dictionary.slash_menu[key].title,
    type,
    props,
    icon: icons[key],
  }));

export const BlockTypeSelect = (props: { items?: BlockTypeSelectItem[] }) => {
  const Components = useComponentsContext()!;
  const uiMode = useUIMode();
  const portalElement = usePortalElement();

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block],
  });
  const firstSelectedBlock = selectedBlocks[0];

  // Filters out all items in which the block type and props don't conform to
  // the schema.
  const filteredItems = useMemo(
    () =>
      (props.items || blockTypeSelectItems(editor)).filter((item) =>
        editorHasBlockWithType(
          editor,
          item.type,
          Object.fromEntries(
            Object.entries(item.props || {}).map(([propName, propValue]) => [
              propName,
              typeof propValue,
            ]),
          ) as Record<string, "string" | "number" | "boolean">,
        ),
      ),
    [editor, props.items],
  );

  // Processes `filteredItems` to an array that can be passed to
  // `Components.FormattingToolbar.Select`.
  const selectItems: ComponentProps["FormattingToolbar"]["Select"]["items"] =
    useMemo(() => {
      return filteredItems.map((item) => {
        const Icon = item.icon;

        const typesMatch = item.type === firstSelectedBlock.type;
        const propsMatch =
          Object.entries(item.props || {}).filter(
            ([propName, propValue]) =>
              propValue !== firstSelectedBlock.props[propName],
          ).length === 0;

        return {
          text: item.name,
          icon: <Icon size={16} />,
          onClick: () => {
            editor.focus();
            editor.transact(() => {
              for (const block of selectedBlocks) {
                editor.updateBlock(block, {
                  type: item.type as any,
                  props: item.props as any,
                });
              }
            });
          },
          isSelected: typesMatch && propsMatch,
        };
      });
    }, [
      editor,
      filteredItems,
      firstSelectedBlock.props,
      firstSelectedBlock.type,
      selectedBlocks,
    ]);

  const shouldShow: boolean = useMemo(
    () => selectItems.find((item) => item.isSelected) !== undefined,
    [selectItems],
  );

  if (!shouldShow || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Select
      className={"bn-select"}
      items={selectItems}
      // Portal the dropdown into the editor's themed portal target so it
      // inherits styling; on mobile `preventFocusOnOpen` keeps focus in the
      // editor so the on-screen keyboard stays up.
      portalElement={portalElement}
      // How-to-test: without it, opening the block type select from the mobile toolbar moves focus into it and closes the keyboard, in every skin (covered by skinFocus, android, all skins: "opening the block type select keeps focus in the editor").
      preventFocusOnOpen={uiMode === "mobile"}
    />
  );
};
