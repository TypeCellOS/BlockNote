import { ActionIcon } from "@mantine/core";
import { AiOutlinePlus } from "react-icons/all";

export type AddBlockButtonProps = {
  addBlock: () => void;
};

export const AddBlockButton = (props: AddBlockButtonProps) => {
  return (
    <ActionIcon size={24} color={"brandFinal.3"} data-test={"dragHandleAdd"}>
      {<AiOutlinePlus size={24} onClick={props.addBlock} />}
    </ActionIcon>
  );
};
