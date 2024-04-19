export function SuggestionMenuEmptyItem(props: { children: React.ReactNode }) {
  // TODO: remove mantine classname
  return (
    <div className={"bn-slash-menu-item mantine-Menu-item"}>
      <div className="mantine-Menu-itemLabel">{props.children}</div>
    </div>
  );
}
