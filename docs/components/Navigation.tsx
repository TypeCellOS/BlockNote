/* eslint-disable @typescript-eslint/no-unsafe-call -- Lots of Nextra magic. */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- Lots of Nextra magic. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Lots of Nextra magic. */

import { Navbar } from "nextra-theme-docs";
import "./navigation.css";

export function Navigation(props: any) {
  // items last to override the default
  // return <div>hello</div>;
  return (
    <>
      <div className="top-banner">
        🚀 BlockNote AI is here!{" "}
        <a href="/docs/ai">Access the early preview.</a>
      </div>
      <Navbar {...props} />
    </>
  );
}
