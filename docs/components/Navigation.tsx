/* eslint-disable @typescript-eslint/no-unsafe-call -- Lots of Nextra magic. */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Lots of Nextra magic. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Lots of Nextra magic. */

import { Navbar } from "nextra-theme-docs";

export function Navigation(props: any) {
  // items last to override the default
  // return <div>hello</div>;
  return <Navbar {...props} />;
}
