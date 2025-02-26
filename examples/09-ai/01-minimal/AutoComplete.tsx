import { Combobox, TextInput, useCombobox } from "@mantine/core";
import { AI_MODELS } from "./data/aimodels.js";

// https://mantine.dev/combobox/?e=BasicAutocomplete
export function BasicAutocomplete(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { value, onChange } = props;
  const combobox = useCombobox();

  const shouldFilterOptions = !AI_MODELS.some((item) => item === value);
  const filteredOptions = shouldFilterOptions
    ? AI_MODELS.filter((item) =>
        item.toLowerCase().includes(value.toLowerCase().trim())
      )
    : AI_MODELS;

  const options = filteredOptions.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  return (
    <Combobox
      onOptionSubmit={(optionValue) => {
        onChange(optionValue);
        combobox.closeDropdown();
      }}
      store={combobox}
      withinPortal={false}>
      <Combobox.Target>
        <TextInput
          label="Select model or type `<provider>/<model>`:"
          placeholder="Select model or type `<provider>/<model>`"
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={200} style={{ overflowY: "auto" }}>
          {options.length === 0 ? (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          ) : (
            options
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
