// import { authClient } from "@/util/auth-client";
import dynamic from "next/dynamic";
import { AiFillGithub } from "react-icons/ai";
import { SiStackblitz } from "react-icons/si";
// import "../pages/landing/gradients.css";
import "./styles.css";

// import CTAButton from "../../components/pages/landing/shared/CTAButton";
// import { SectionHeader } from "../../components/pages/landing/shared/Headings";
const CTAButton = ({
  children,
  href,
  color,
  size,
  hoverGlow,
}: {
  children: React.ReactNode;
  href: string;
  color: string;
  size: string;
  hoverGlow: boolean;
}) => children;
const SectionHeader = ({ children }: { children: React.ReactNode }) => children;

const baseGitHubURL = "https://github.com/TypeCellOS/BlockNote/tree/main/";
// const baseCodeSandboxURL =
//   "https://githubbox.com/TypeCellOS/BlockNote/tree/main/";

const baseStackBlitzURL =
  "https://www.stackblitz.com/github/TypeCellOS/BlockNote/tree/main/";

// const ThemedExample = dynamic(() => import("./ThemedExample"), {
//   ssr: false,
// });

export async function Example(props: {
  name: string;
  path: string;
  children: any;
  pro?: boolean;
}) {
  const Component = dynamic(
    () => import("./example/generated/components/" + props.name + "/index"),
  );
  // const showCode =
  //   !props.isProExample ||
  //   props.isProExample.userStatus === "starter" ||
  //   props.isProExample.userStatus === "business";
  const showCode = true;

  return (
    <div className="demo nx-bg-primary-700/5 dark:nx-bg-primary-300/10 mt-6 rounded-lg p-4">
      {showCode && (
        <div className={"z-10 flex flex-row gap-6 pb-4"}>
          <a
            className={
              "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
            }
            href={`${baseGitHubURL}${props.path}/`}
            target="_blank"
            rel="noreferrer">
            <AiFillGithub />
            <div className={"text-sm"}>GitHub</div>
          </a>
          <a
            className={
              "nx-select-none nx-text-gray-600 hover:nx-text-black dark:nx-text-gray-200 dark:hover:nx-text-white flex flex-row items-center gap-1"
            }
            href={`${baseStackBlitzURL}${props.path}/`}
            target="_blank"
            rel="noreferrer">
            <SiStackblitz />
            <div className={"text-sm"}>StackBlitz</div>
          </a>
        </div>
      )}
      <div className={"demo-contents h-96 overflow-auto rounded-lg"}>
        <Component />
      </div>
      {showCode ? (
        props.children
      ) : (
        <div
          className={
            "relative flex h-96 flex-col items-center justify-center gap-2"
          }>
          <div className={"absolute h-1/2 w-1/2"}>
            <div className={"cta-glow h-full w-full"}></div>
          </div>
          <div className={"z-10 flex w-2/3 flex-col items-center"}>
            <SectionHeader>Pro Example</SectionHeader>
            <p className={"text-center text-[#00000080] dark:text-[#FFFFFFB2]"}>
              Get access to the full source code for pro examples by subscribing
              to BlockNote Pro
            </p>
            <div className={"mt-8"}>
              <CTAButton
                href={"/pricing"}
                color={"pro"}
                size={"large"}
                hoverGlow={true}>
                Get BlockNote Pro
              </CTAButton>
            </div>
            {/* {!props.isProExample?.userStatus && (
              <p className={"mt-1 text-xs"}>
                Or{" "}
                <button
                  className={"nx-text-primary-600"}
                  onClick={async () => {
                    await authClient.signIn.social({
                      provider: "github",
                    });
                  }}>
                  sign in
                </button>{" "}
                via GitHub
              </p>
            )} */}
          </div>
        </div>
      )}
    </div>
  );
}
