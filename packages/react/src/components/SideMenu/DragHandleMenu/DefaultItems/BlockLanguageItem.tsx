import {
  blockHasType,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
  defaultProps,
  editorHasBlockWithType,
} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import type { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { usePortalElement } from "../../../../editor/PortalElementOverride.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";
import { useDictionary } from "../../../../i18n/dictionary.js";

/** An opt-in submenu for assigning a human language to a block. */
export function BlockLanguageItem(props: {
  children: ReactNode;
  languages: readonly { label: string; language: string }[];
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const portalElement = usePortalElement();
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });
  const languageProps = { lang: defaultProps.lang };

  if (
    !block ||
    !blockHasType(block, editor, block.type, languageProps) ||
    !editorHasBlockWithType(editor, block.type, languageProps)
  ) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root
      position="right"
      sub={true}
      portalElement={portalElement}
    >
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className="bn-menu-item"
          subTrigger={true}
        >
          {props.children}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown sub={true} className="bn-menu-dropdown">
        <Components.Generic.Menu.Item
          checked={block.props.lang === undefined}
          onClick={() =>
            editor.updateBlock(block, { props: { lang: undefined } })
          }
        >
          {dict.language_picker.default}
        </Components.Generic.Menu.Item>
        {props.languages.map(({ label, language }) => (
          <Components.Generic.Menu.Item
            key={language}
            checked={block.props.lang === language}
            onClick={() =>
              editor.updateBlock(block, { props: { lang: language } })
            }
          >
            {label}
          </Components.Generic.Menu.Item>
        ))}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}
