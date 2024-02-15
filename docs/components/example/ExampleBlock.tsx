import dynamic from "next/dynamic";
import { AiFillCodeSandboxCircle, AiFillGithub } from "react-icons/ai";

import { examples } from "./generated/exampleComponents.gen";
import "./styles.css";


const baseGitHubURL =
  "https://github.com/TypeCellOS/BlockNote/tree/main/examples/";
const baseCodeSandboxURL =
  "https://githubbox.com/TypeCellOS/BlockNote/tree/main/examples/";

const ThemedExample = dynamic(() => import("./ThemedExample"), {
  ssr: false,
});
  
export function ExampleBlock(props: {
  name: keyof typeof examples;
  children: any;
}) {
  // const example = examplesFlattened.find((e) => e.slug === props.name);
  // if (!example) {
  //   throw new Error("invalid example");
  // }
  

  return (
    <div className="nx-bg-primary-700/5 dark:nx-bg-primary-300/10 mt-6 rounded-lg p-4">
      <div className={"flex flex-row gap-6 pb-4"}>
        <button
          className={
            "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
          }
          onClick={() => window.open(`${baseGitHubURL}${props.name}/`)}>
          <AiFillGithub />
          <div className={"text-sm"}>GitHub</div>
        </button>
        <button
          className={
            "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
          }
          onClick={() => window.open(`${baseCodeSandboxURL}${props.name}/`)}>
          <AiFillCodeSandboxCircle />
          <div className={"text-sm"}>CodeSandbox</div>
        </button>
      </div>
      <div className={"h-64 overflow-scroll rounded-lg"}>
          <ThemedExample name={props.name} />
      </div>
      {props.children}
    </div>
  );
}
