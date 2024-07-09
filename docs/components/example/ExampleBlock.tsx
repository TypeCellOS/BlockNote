import dynamic from "next/dynamic";
import { AiFillGithub } from "react-icons/ai";
import { SiStackblitz } from "react-icons/si";

import { examples } from "./generated/exampleComponents.gen";
import "./styles.css";
import { signIn, useSession } from "next-auth/react";
import { getProLevel } from "@/util/authUtil";

const baseGitHubURL = "https://github.com/TypeCellOS/BlockNote/tree/main/";
// const baseCodeSandboxURL =
//   "https://githubbox.com/TypeCellOS/BlockNote/tree/main/";

const baseStackBlitzURL =
  "https://www.stackblitz.com/github/TypeCellOS/BlockNote/tree/main/";

const ThemedExample = dynamic(() => import("./ThemedExample"), {
  ssr: false,
});

export function ExampleBlock(props: {
  name: keyof typeof examples;
  path: string;
  children: any;
  // TODO: Is hideCode needed?
  hideCode: boolean;
}) {
  // const example = examplesFlattened.find((e) => e.slug === props.name);
  // if (!example) {
  //   throw new Error("invalid example");
  // }

  const session = useSession();
  const userType = getProLevel(session);

  return (
    <div className="demo nx-bg-primary-700/5 dark:nx-bg-primary-300/10 mt-6 rounded-lg p-4">
      <div className={"flex flex-row gap-6 pb-4"}>
        <a
          className={
            "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
          }
          href={`${baseGitHubURL}${props.path}/`}
          target="_blank">
          <AiFillGithub />
          <div className={"text-sm"}>GitHub</div>
        </a>
        <a
          className={
            "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
          }
          href={`${baseStackBlitzURL}${props.path}/`}
          target="_blank">
          <SiStackblitz />
          <div className={"text-sm"}>StackBlitz</div>
        </a>
      </div>
      <div className={"demo-contents h-96 overflow-auto rounded-lg"}>
        <ThemedExample name={props.name} />
      </div>
      {userType === "pro" ? (
        props.children
      ) : (
        <div className={"flex h-96 flex-col items-center justify-center gap-2"}>
          <div>
            <a
              className={"nx-text-primary-600 text-4xl font-bold"}
              href={"/pricing"}>
              Get BlockNote Pro
            </a>{" "}
          </div>
          <div>
            {userType === undefined && (
              <>
                or{" "}
                <button
                  className={"nx-text-primary-600 font-bold"}
                  onClick={async () => {
                    await signIn("github", {});
                  }}>
                  Sign In
                </button>{" "}
              </>
            )}
            to access Pro example code
          </div>
        </div>
      )}
    </div>
  );
}
