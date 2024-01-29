import { AppShell, MantineProvider, ScrollArea } from "@mantine/core";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { examples } from "./examples.gen";
import "./style.css";

window.React = React;

const modules = import.meta.glob("../../examples/*/App.tsx");

const editors = examples;

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
    <MantineProvider>
      <AppShell
        padding={0}
        //   header={<Header height={60} p="xs">
        //   {/* Header content */}
        // </Header>}
        styles={() => ({
          main: {
            backgroundColor: "white",
            // theme.colorScheme === "dark"
            //   ? theme.colors.dark[8]
            //   : theme.colors.gray[0],
          },
        })}>
        {window.location.search.includes("hideMenu") ? undefined : (
          <AppShell.Navbar w={{ base: 300 }} p="xs">
            <AppShell.Section grow component={ScrollArea} mx="-xs" px="xs">
              {editors
                .flatMap((g) => g.projects)
                .map((editor, i) => (
                  <div key={i}>
                    <Link to={editor.slug}>{editor.title}</Link>
                  </div>
                ))}

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
            </AppShell.Section>
          </AppShell.Navbar>
        )}
        <Outlet />
      </AppShell>
    </MantineProvider>
  );
}

const App = (props: { project: (typeof examples)[0]["projects"][0] }) => {
  const [ExampleComponent, setExampleComponent] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      // load app async
      const c: any = await modules[
        "../../" + props.project.pathFromRoot + "/App.tsx"
      ]();
      setExampleComponent(c);
    })();
  }, [props.project.pathFromRoot]);

  if (!ExampleComponent) {
    return <div>Loading...</div>;
  }
  return <ExampleComponent.default />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: editors
      .flatMap((g) => g.projects)
      .map((editor) => ({
        path: editor.slug,
        element: <App project={editor} />,
      })),
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
