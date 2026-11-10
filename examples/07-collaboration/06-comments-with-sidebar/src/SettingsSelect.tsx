// A plain select with a label. This is application UI, so it's built from your
// own elements (or your app's component library) rather than BlockNote's
// components, and can live anywhere in your layout.
export function SettingsSelect<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className={"settings-select"}>
      {props.label + ":"}
      <select
        value={props.value}
        onChange={(event) => {
          const option = props.options.find(
            (option) => option.value === event.target.value,
          );
          if (option) {
            props.onChange(option.value);
          }
        }}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
