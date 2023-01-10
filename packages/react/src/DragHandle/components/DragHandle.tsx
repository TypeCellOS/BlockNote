import { ActionIcon } from "@mantine/core";
import { MdDragIndicator } from "react-icons/all";

export const DragHandle = () => {
  return (
    <ActionIcon size={24} color={"brandFinal.3"} data-test={"dragHandle"}>
      {<MdDragIndicator size={24} />}
    </ActionIcon>
  );
};
