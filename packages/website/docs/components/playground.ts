import { Sandpack } from "sandpack-vue3";
import { useData } from "vitepress";
import { defineComponent, h } from "vue";

export interface PlaygroundProps {
  name: string;
  files: Record<string, { hidden: boolean; code: string }>;
  expand?: boolean;
}

export const Playground = defineComponent<PlaygroundProps>(
  (props) => {
    const { isDark } = useData();

    const packageJson = props.files["/package.json"];
    const json = JSON.parse(packageJson.code);
    const dependencies = json.dependencies;

    // const files = clone(props.files);
    // const fileNames = Object.keys(files).map((name) => name.replace(/^\//, ""));

    // const dependencies = extractDependencies(files);
    // patchFiles(files);

    // const template = replaceBuiltinApp(getTemplate(props.name));

    return () =>
      h(
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
            customSetup: {
              environment: "node",
              dependencies: {
                ...dependencies,
                // postcss: "8.4.28",
                // tailwindcss: "3.3.3",
                // "@egoist/tailwindcss-icons": "1.3.3",
                // "@iconify-json/ci": "1.1.10",
                // prosekit: "latest",
              },
            },
            files: {
              ...props.files,
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
  },
  {
    props: ["files", "expand", "name"],
  }
);
