import { Editor } from "@tiptap/core";
import {
  RiBold,
  RiH1,
  RiH2,
  RiH3,
  RiIndentDecrease,
  RiIndentIncrease,
  RiItalic,
  RiLink,
  RiListOrdered,
  RiListUnordered,
  RiStrikethrough,
  RiText,
  RiUnderline,
} from "react-icons/ri";
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { SimpleToolbarDropdown } from "../../../shared/components/toolbar/SimpleToolbarDropdown";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import formatKeyboardShortcut from "../../helpers/formatKeyboardShortcut";
import LinkToolbarButton from "./LinkToolbarButton";
import { MantineProvider } from "@mantine/core";
import { IconType } from "react-icons";

type ListType = "li" | "oli";

function getBlockName(
  currentBlockHeading: number | undefined,
  currentBlockListType: ListType | undefined
) {
  const headings = ["Heading 1", "Heading 2", "Heading 3"];
  const lists = {
    li: "Bullet List",
    oli: "Numbered List",
  };
  // A heading that's also a list, should show as Heading
  if (currentBlockHeading) {
    return headings[currentBlockHeading - 1];
  } else if (currentBlockListType) {
    return lists[currentBlockListType];
  } else {
    return "Text";
  }
}

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  useEditorForceUpdate(props.editor);

  const currentBlock = findBlock(props.editor.state.selection);
  const currentBlockHeading: number | undefined =
    currentBlock?.node.attrs.headingType;
  const currentBlockListType: ListType | undefined =
    currentBlock?.node.attrs.listType;

  const currentBlockName = getBlockName(
    currentBlockHeading,
    currentBlockListType
  );

  const blockIconMap: Record<string, IconType> = {
    Text: RiText,
    "Heading 1": RiH1,
    "Heading 2": RiH2,
    "Heading 3": RiH3,
    "Bullet List": RiListUnordered,
    "Numbered List": RiListOrdered,
  };

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        activeStyles: {
          transform: "none",
        },
        colorScheme: "light",
        colors: {
          "ocean-blue": [
            "#7AD1DD",
            "#5FCCDB",
            "#44CADC",
            "#2AC9DE",
            "#1AC2D9",
            "#11B7CD",
            "#09ADC3",
            "#0E99AC",
            "#128797",
            "#147885",
          ],
          "bright-pink": [
            "#F0BBDD",
            "#ED9BCF",
            "#EC7CC3",
            "#ED5DB8",
            "#F13EAF",
            "#F71FA7",
            "#FF00A1",
            "#E00890",
            "#C50E82",
            "#AD1374",
          ],
          brand: [
            "#a2aab8",
            "#8b95a6",
            "#748094",
            "#5d6b82",
            "#455571",
            "#2e405f",
            "#172b4d",
            "#152745",
            "#12223e",
            "#101e36",
          ],
          brand2: [
            "#f1f3f5",
            "#f1f3f5",
            "#7397d5",
            "#507dcb",
            "#3666b6",
            "#2c5293",
            "#213f70",
            "#172b4d",
            "#12223e",
            "#101e36",
          ],
          brand3: [
            "#f1f3f5",
            "#B7C3D7",
            "#92A3C0",
            "#7186A9",
            "#556B92",
            "#3B527B",
            "#273D64",
            "#172b4d",
            "#12223e",
            "#101e36",
          ],
        },
        fontFamily: "Inter",
        primaryColor: "brand3",
        primaryShade: 7,
      }}>
      <Toolbar>
        <SimpleToolbarDropdown
          text={currentBlockName}
          icon={blockIconMap[currentBlockName]}
          items={[
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetBlockHeading()
                  .unsetList()
                  .run(),
              text: "Text",
              icon: RiText,
            },
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetList()
                  .setBlockHeading({ level: "1" })
                  .run(),
              text: "Heading 1",
              icon: RiH1,
            },
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetList()
                  .setBlockHeading({ level: "2" })
                  .run(),
              text: "Heading 2",
              icon: RiH2,
            },
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetList()
                  .setBlockHeading({ level: "3" })
                  .run(),
              text: "Heading 3",
              icon: RiH3,
            },
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetBlockHeading()
                  .setBlockList("li")
                  .run(),
              text: "Bullet List",
              icon: RiListUnordered,
            },
            {
              onClick: () =>
                props.editor
                  .chain()
                  .focus()
                  .unsetBlockHeading()
                  .setBlockList("oli")
                  .run(),
              text: "Numbered List",
              icon: RiListOrdered,
            },
          ]}
        />
        <SimpleToolbarButton
          onClick={() => props.editor.chain().focus().toggleBold().run()}
          isSelected={props.editor.isActive("bold")}
          mainTooltip="Bold"
          secondaryTooltip={formatKeyboardShortcut("Mod+B")}
          icon={RiBold}
        />
        <SimpleToolbarButton
          onClick={() => props.editor.chain().focus().toggleItalic().run()}
          isSelected={props.editor.isActive("italic")}
          mainTooltip="Italic"
          secondaryTooltip={formatKeyboardShortcut("Mod+I")}
          icon={RiItalic}
        />
        <SimpleToolbarButton
          onClick={() => props.editor.chain().focus().toggleUnderline().run()}
          isSelected={props.editor.isActive("underline")}
          mainTooltip="Underline"
          secondaryTooltip={formatKeyboardShortcut("Mod+U")}
          icon={RiUnderline}
        />
        <SimpleToolbarButton
          onClick={() => props.editor.chain().focus().toggleStrike().run()}
          isSelected={props.editor.isActive("strike")}
          mainTooltip="Strike-through"
          secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
          icon={RiStrikethrough}
        />
        <SimpleToolbarButton
          onClick={() =>
            props.editor.chain().focus().sinkListItem("block").run()
          }
          isDisabled={!props.editor.can().sinkListItem("block")}
          mainTooltip="Indent"
          secondaryTooltip={formatKeyboardShortcut("Tab")}
          icon={RiIndentIncrease}
        />

        <SimpleToolbarButton
          onClick={() =>
            props.editor.chain().focus().liftListItem("block").run()
          }
          isDisabled={
            !props.editor.can().command(({ state }) => {
              const block = findBlock(state.selection);
              if (!block) {
                return false;
              }
              // If the depth is greater than 2 you can lift
              return block.depth > 2;
            })
          }
          mainTooltip="Decrease Indent"
          secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
          icon={RiIndentDecrease}
        />

        <LinkToolbarButton
          // editor={props.editor}
          isSelected={props.editor.isActive("link")}
          mainTooltip="Link"
          secondaryTooltip={formatKeyboardShortcut("Mod+K")}
          icon={RiLink}
          editor={props.editor}
        />
        {/* <SimpleBubbleMenuButton
          editor={props.editor}
          onClick={() => {
            const comment = this.props.commentStore.createComment();
            props.editor.chain().focus().setComment(comment.id).run();
          }}
          styleDetails={comment}
        /> */}
      </Toolbar>
    </MantineProvider>
  );
};
