// import { authClient } from "@/util/auth-client";
import dynamic from "next/dynamic";
import { AiFillGithub } from "react-icons/ai";
import { SiStackblitz } from "react-icons/si";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import fs from "fs";

import CTAButton from "@/components/CTAButton";
import { SectionHeader } from "@/components/Headings";

const ThemedExample = dynamic(() => import("./ThemedExample"));

function ExampleDemoBarSourceCodeLink(props: {
  name: string;
  platform: {
    name: string;
    icon: React.ReactNode;
    baseUrl: string;
  };
}) {
  return (
    <a
      className={
        "hover:text-fd-accent-foreground flex items-center gap-1 py-2 text-sm font-medium"
      }
      href={`${props.platform.baseUrl}${props.name}/`}
      target="_blank"
      rel="noreferrer"
    >
      {props.platform.icon}
      <div>{props.platform.name}</div>
    </a>
  );
}

function ExampleDemoBar(props: { name: string }) {
  return (
    <div className={"flex items-center gap-4 px-4"}>
      <ExampleDemoBarSourceCodeLink
        name={props.name}
        platform={{
          name: "GitHub",
          icon: <AiFillGithub size={16} />,
          baseUrl: "https://github.com/TypeCellOS/BlockNote/tree/main/",
        }}
      />
      <ExampleDemoBarSourceCodeLink
        name={props.name}
        platform={{
          name: "StackBlitz",
          icon: <SiStackblitz size={16} />,
          baseUrl:
            "https://www.stackblitz.com/github/TypeCellOS/BlockNote/tree/main/",
        }}
      />
    </div>
  );
}

function ExampleDemo(props: { name: string }) {
  return (
    <div className="not-prose bg-fd-secondary border-fd-border flex h-[600px] flex-col rounded-xl border">
      <ExampleDemoBar name={props.name} />
      <div
        className={"demo-contents bg-fd-background h-0 flex-1 rounded-xl p-4"}
      >
        <ThemedExample name={props.name} />
      </div>
    </div>
  );
}

function ExampleCode(props: { name: string }) {
  const files = fs
    .readdirSync("components/example/generated/components/" + props.name)
    .filter((file) => file !== "index.tsx");

  return (
    <Tabs items={files}>
      {files.map((file) => (
        <Tab key={file} value={file}>
          <DynamicCodeBlock
            lang="tsx"
            code={fs.readFileSync(
              "components/example/generated/components/" +
                props.name +
                "/" +
                file,
              "utf-8",
            )}
          />
        </Tab>
      ))}
    </Tabs>
  );
}

function ExampleProPrompt() {
  return (
    <div
      className={
        "bg-fd-background border-fd-border relative my-4 flex h-[600px] flex-col items-center justify-center gap-2 rounded-xl border"
      }
    >
      <div className={"absolute h-1/2 w-1/2"}>
        <div className={"cta-glow h-full w-full"}></div>
      </div>
      <div className={"z-10 flex w-2/3 flex-col items-center"}>
        <SectionHeader>Pro Example</SectionHeader>
        <p className={"text-center"}>
          Get access to the full source code for pro examples by subscribing to
          BlockNote Pro
        </p>
        <div className={"mt-8"}>
          <CTAButton href={"/pricing"} size={"large"} hoverGlow={true}>
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
  );
}

export async function Example(props: { name: string; isPro?: boolean }) {
  // const showCode =
  //   !props.isProExample ||
  //   props.isProExample.userStatus === "starter" ||
  //   props.isProExample.userStatus === "business";

  return (
    <div className="demo">
      <ExampleDemo name={props.name} />
      {props.isPro ? <ExampleCode name={props.name} /> : <ExampleProPrompt />}
    </div>
  );
}
