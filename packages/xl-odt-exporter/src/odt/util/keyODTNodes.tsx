import { Fragment, type ReactNode } from "react";

/** Key lists at the XML render boundary without wrapping mapping inputs. */
export function keyODTNodes(nodes: ReactNode[]) {
  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
