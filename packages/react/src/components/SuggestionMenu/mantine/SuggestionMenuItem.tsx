import { Badge, Stack, Text, UnstyledButton } from "@mantine/core";
import { useCallback, useRef } from "react";
import { useComponentsContext } from "../../../editor/ComponentsContext";

export function SuggestionMenuItem(props: {
  title: string;
  onClick: () => void;
  subtext?: string;
  icon?: JSX.Element;
  badge?: string;
  isSelected?: boolean;
  setSelected: (selected: boolean) => void;
}) {
  const { setSelected } = props;
  const components = useComponentsContext()!;
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseLeave = useCallback(() => {
    setSelected(false);
  }, [setSelected]);

  const handleMouseEnter = useCallback(() => {
    setSelected(true);
  }, [setSelected]);

  return (
    <UnstyledButton
      component="div"
      className={"bn-slash-menu-item mantine-Menu-item"}
      onClick={props.onClick}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={props.isSelected ? "" : undefined}
      ref={itemRef}>
      {props.icon && (
        <div className="mantine-Menu-itemSection" data-position="left">
          {props.icon}
        </div>
      )}
      <div className="mantine-Menu-itemLabel">
        <Stack>
          {/*Might need separate classes.*/}
          <Text lh={"20px"} size={"14px"} fw={500}>
            {props.title}
          </Text>
          <Text lh={"16px"} size={"10px"}>
            {props.subtext}
          </Text>
        </Stack>
      </div>
      {props.badge && (
        <div data-position="right" className="mantine-Menu-itemSection">
          <Badge size={"xs"}>{props.badge}</Badge>
        </div>
      )}
    </UnstyledButton>
  );
}
