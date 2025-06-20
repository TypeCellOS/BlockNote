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

const ThemedExample = dynamic(() => import("./ThemedExample"));

export async function Example(props: {
  name: string;
  path: string;
  children: any;
  pro?: boolean;
}) {
  // const showCode =
  //   !props.isProExample ||
  //   props.isProExample.userStatus === "starter" ||
  //   props.isProExample.userStatus === "business";
  const showCode = true;

  return (
    <div className="demo">
      <div className="not-prose bg-fd-secondary border-fd-border flex h-[600px] flex-col rounded-xl border">
        {showCode && (
          <div className={"flex items-center gap-4 px-4"}>
            <a
              className={
                "hover:text-fd-accent-foreground flex items-center gap-1 py-2 text-sm font-medium"
              }
              href={`${baseGitHubURL}${props.path}/`}
              target="_blank"
              rel="noreferrer"
            >
              <AiFillGithub size={16} />
              <div>GitHub</div>
            </a>
            <a
              className={
                "hover:text-fd-accent-foreground flex items-center gap-1 py-2 text-sm font-medium"
              }
              href={`${baseStackBlitzURL}${props.path}/`}
              target="_blank"
              rel="noreferrer"
            >
              <SiStackblitz size={16} />
              <div className={"text-sm"}>StackBlitz</div>
            </a>
          </div>
        )}
        <div
          className={"demo-contents bg-fd-background h-0 flex-1 rounded-xl p-4"}
        >
          <ThemedExample name={props.name} />
        </div>
      </div>
      {showCode ? (
        props.children
      ) : (
        <div
          className={
            "relative flex h-96 flex-col items-center justify-center gap-2"
          }
        >
          <div className={"absolute h-1/2 w-1/2"}>
            <div className={"cta-glow h-full w-full"}></div>
          </div>
          <div className={"z-10 flex w-2/3 flex-col items-center"}>
            <SectionHeader>Pro Example</SectionHeader>
            <p className={"text-center"}>
              Get access to the full source code for pro examples by subscribing
              to BlockNote Pro
            </p>
            <div className={"mt-8"}>
              <CTAButton
                href={"/pricing"}
                color={"pro"}
                size={"large"}
                hoverGlow={true}
              >
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
