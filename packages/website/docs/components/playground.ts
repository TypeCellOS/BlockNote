import { Sandpack } from "sandpack-vue3";
import { useData } from "vitepress";
import { defineComponent, h } from "vue";
export interface PlaygroundProps {
  name: string;
  files: Record<string, { hidden: boolean; code: string }>;
  expand?: boolean;
  dark?: boolean;
}

export const Playground = defineComponent<PlaygroundProps>(
  (props) => {
    const { isDark } = useData();

    const packageJson = props.files["/package.json"];
    const json = JSON.parse(packageJson.code);
    const dependencies = json.dependencies;
    const devDependencies = json.devDependencies || {};

    // const x = SANDBOX_TEMPLATES["vite-react-ts"];

    const f = Object.fromEntries(
      Object.entries(props.files).filter(
        (f) =>
          !f[0].includes("index.html") &&
          !f[0].includes("vite") &&
          !f[0].includes("package.json") &&
          !f[0].includes("tsconfig.json")
      )
    );

    return () => {
      f["/App.tsx"] = {
        ...props.files["/App.tsx"],
        code: props.files["/App.tsx"].code.replace(
          "<BlockNoteView ",
          `<BlockNoteView theme={${JSON.stringify(
            isDark.value ? "dark" : "light"
          )}} `
        ),
      };

      return h(
        "div",
        {
          class:
            "sandpack-editor" +
            " " +
            (props.expand ? "sandpack-editor-expand" : ""),
        },
        [
          h(Sandpack, {
            theme: isDark.value ? "dark" : "light",
            // template: "vite-react-ts",

            customSetup: {
              // environment: "node",
              entry: "main.tsx",
              //   entry: "/main.tsx",
              dependencies: {
                ...Object.fromEntries(
                  Object.entries(dependencies).filter(
                    ([k]) => !k.includes("vite")
                  )
                ),
                "react-scripts": "^5.0.0",
              },
              devDependencies: {
                ...(Object.fromEntries(
                  Object.entries(devDependencies).filter(
                    ([k]) => !k.includes("vite")
                  )
                ) as any),
                // needed for sandpack
                // vite: "4.2.2",
                // "esbuild-wasm": "^0.17.19",
              },
            },
            files: {
              ...f,
              // ...props.files,
            },
            options: {
              activeFile: "App.tsx",
              showLineNumbers: true,
              editorHeight: "100%",
              showTabs: true,
            },
          }),
        ]
      );
    };
  },
  {
    props: ["files", "expand", "name"],
  }
);
