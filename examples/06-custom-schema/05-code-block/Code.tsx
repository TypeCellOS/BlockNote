"use client";

import { useState } from "react";
import { ReactCustomBlockRenderProps } from "@blocknote/react";
import {
  defaultProps,
  PropSchema,
  BlockConfig,
  CustomBlockConfig,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import CodeMirror from "@uiw/react-codemirror";
import {
  langs,
  langNames,
  LanguageName,
} from "@uiw/codemirror-extensions-langs";
import { material } from "@uiw/codemirror-theme-material";
import {
  CheckIcon,
  Group,
  Combobox,
  Input,
  InputBase,
  useCombobox,
} from "@mantine/core";
import "./styles.css";

// // Custom block configuration
type CustomCodeBlockConfig = {
  type: string;
  readonly propSchema: {
    language: {
      default: string;
    };
    data: {
      default: string;
    };
  };
  content: "none";
  isSelectable?: boolean;
  isFileBlock: false;
};

// Dropdown search component for selecting language
// export const SelectDropdownSearch = (props: any
export const SelectDropdownSearch = (
  props: Omit<
    ReactCustomBlockRenderProps<CustomCodeBlockConfig, any, any>,
    "contentRef"
  >
) => {
  const [search, setSearch] = useState("");
  const [value, setValue] = useState<string>(props.block.props.language);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.focusTarget();
      setSearch("");
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
  });

  // options for the dropdown from CodeMirror language names
  const options = langNames
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option value={item} key={item} active={item === value}>
        <Group gap="xs">
          {item === value && <CheckIcon size={12} />}
          <span>{item}</span>
        </Group>
      </Combobox.Option>
    ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        setValue(val);
        props.editor.updateBlock(props.block, {
          props: {
            ...props.block.props,
            language: val,
          },
        });
        combobox.closeDropdown();
      }}>
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none">
          {value || <Input.Placeholder>Pick language</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search language..."
        />
        <Combobox.Options mah={200} style={{ overflowY: "auto" }}>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>No language found.</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export const Code = createReactBlockSpec(
  {
    type: "codeBlock",
    content: "none",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      data: {
        default: "",
      },
      language: {
        default: "javascript",
      },
    },
  },
  {
    render: (props) => {
      const { data } = props.block.props;
      const { language } = props.block.props;

      // event handler for input change
      const onInputChange = (val: string) => {
        props.editor.updateBlock(props.block, {
          props: {
            ...props.block.props,
            language: val,
          },
        });
      };

      return (
        // wrapper for Code block
        <div className={"code-block"}>
          {/* section to display currently selected language */}
          <div className={"code-block-language-wrapper"}>
            <SelectDropdownSearch
              block={props.block}
              editor={props.editor as any}
            />
          </div>

          {/* component to display code using Codemirror */}
          <CodeMirror
            id={props.block.id}
            placeholder={"Write your code here..."}
            style={{
              width: "100%",
            }}
            extensions={[langs[language as LanguageName]()]}
            value={data}
            theme={material}
            editable={props.editor.isEditable}
            onChange={onInputChange}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
            }}
          />
        </div>
      );
    },
  }
);
