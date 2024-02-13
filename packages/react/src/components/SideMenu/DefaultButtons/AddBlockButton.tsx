import { AiOutlinePlus } from "react-icons/ai";
import { SideMenuButton } from "../SideMenuButton";

export const AddBlockButton = (props: { addBlock: () => void }) => (
  <SideMenuButton>
    <AiOutlinePlus
      size={24}
      onClick={props.addBlock}
      data-test={"dragHandleAdd"}
    />
  </SideMenuButton>
);
