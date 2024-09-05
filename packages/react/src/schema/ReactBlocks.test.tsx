import { describe, it } from "vitest";
import { blocksToBlockSpecs } from "./ReactBlocks";

const Alert = () => {
  return <div>alert</div>;
};

describe("can create blockspec from react block", () => {
  it("should create blockspec from react block", () => {
    const ret = blocksToBlockSpecs(<></>);
  });
});
