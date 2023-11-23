import { AppShell, Navbar, ScrollArea } from "@mantine/core";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { App } from "../examples/Basic";
import { ReactInlineContent } from "../examples/ReactInlineContent";
import { ReactStyles } from "../examples/ReactStyles";
import { Two } from "../examples/Two";
import "./style.css";
window.React = React;

function Root() {
  // const linkStyles = (theme) => ({
  //   root: {
  //     // background: "red",
  //     ...theme.fn.hover({
  //       backgroundColor: "#dfdfdd",
  //     }),

  //     "&[data-active]": {
  //       backgroundColor: "rgba(0, 0, 0, 0.04)",
  //     },
  //   },
  //   // "root:hover": { background: "blue" },
  // });
  return (
    <AppShell
      padding={0}
      navbar={
        <Navbar width={{ base: 300 }} style={{ background: "#f7f7f5" }} p="xs">
          <Navbar.Section grow component={ScrollArea} mx="-xs" px="xs">
            <div>
              <Link to={"/simple"}>Simple</Link>
            </div>
            <div>
              <Link to={"/two"}>Two</Link>
            </div>
            <div>
              <Link to={"/react-styles"}>React custom styles</Link>
            </div>
            <div>
              <Link to={"/react-inline-content"}>React inline content</Link>
            </div>
            {/* manitne <NavLink
              styles={linkStyles}
              label="Simple"
              
              onClick={navi}
              // icon={<IconGauge size={16} stroke={1.5} />}
              // rightSection={<IconChevronRight size={12} stroke={1.5} />}
            />
            <NavLink
              styles={linkStyles}
              label="Two"
              // icon={<IconGauge size={16} stroke={1.5} />}
              // rightSection={<IconChevronRight size={12} stroke={1.5} />}
            /> */}
          </Navbar.Section>
        </Navbar>
      }
      header={<></>}
      //   header={<Header height={60} p="xs">
      //   {/* Header content */}
      // </Header>}
      styles={(theme) => ({
        main: {
          backgroundColor: "white",
          // theme.colorScheme === "dark"
          //   ? theme.colors.dark[8]
          //   : theme.colors.gray[0],
        },
      })}>
      <Outlet />
    </AppShell>
  );
}
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "simple",
        element: <App key="simple" />,
      },
      {
        path: "two",
        element: <Two />,
      },
      {
        path: "react-styles",
        element: <ReactStyles key="simple1" />,
      },
      {
        path: "react-inline-content",
        element: <ReactInlineContent key="simple2" />,
      },
    ],
  },
]);

const root = createRoot(document.getElementById("root")!);
root.render(
  // TODO: StrictMode is causing duplicate mounts and conflicts with collaboration
  // <React.StrictMode>
  // <App />
  <RouterProvider router={router} />
  // </React.StrictMode>
);
