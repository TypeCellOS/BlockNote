import { UnstyledButton } from "@mantine/core";

export function SuggestionMenuEmptyItem(props: { children: React.ReactNode }) {
  return (
    <UnstyledButton
      component="div"
      className={"bn-slash-menu-item mantine-Menu-item"}>
      <div className="mantine-Menu-itemLabel">{props.children}</div>
    </UnstyledButton>
  );
}
