import { usePrefersColorScheme } from "@blocknote/react";
import { AppShell, MantineProvider, ScrollArea } from "@mantine/core";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { examples } from "./examples.gen.js";
import "./style.css";

window.React = React;

const modules = import.meta.glob("../../examples/**/*/App.tsx");

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

  const themePreference = usePrefersColorScheme();

  return (
    <MantineProvider
      forceColorScheme={
        themePreference === "no-preference" ? undefined : themePreference
      }
    >
      <AppShell
        navbar={
          window.location.search.includes("hideMenu")
            ? undefined
            : {
                width: 300,
                breakpoint: 0,
              }
        }
        padding={0}
        //   header={<Header height={60} p="xs">
        //   {/* Header content */}
        // </Header>}
      >
        {window.location.search.includes("hideMenu") ? undefined : (
          <AppShell.Navbar p="xs">
            <AppShell.Section grow component={ScrollArea} mx="-xs" px="xs">
              {Object.values(editors)
                .flatMap((g) => g.projects)
                .map((editor, i) => (
                  <div key={i}>
                    <Link to={editor.fullSlug}>{editor.title}</Link>
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
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

const App = (props: { project: (typeof examples.basic)["projects"][0] }) => {
  const [ExampleComponent, setExampleComponent] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      // load app async
      const moduleName = "../../" + props.project.pathFromRoot + "/App.tsx";
      const module = modules[moduleName];
      const c: any = await module();
      setExampleComponent(c);
    })();
  }, [props.project.pathFromRoot]);

  if (!ExampleComponent) {
    return <div>Loading...</div>;
  }
  // eslint-disable-next-line react/jsx-pascal-case
  return <ExampleComponent.default />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: Object.values(editors)
      .flatMap((g) => g.projects)
      .map((editor) => ({
        path: editor.fullSlug,
        element: <App project={editor} />,
      })),
  },
]);

const root = createRoot(document.getElementById("root")!);
root.render(<RouterProvider router={router} />);
