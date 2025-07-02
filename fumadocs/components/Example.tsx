"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { BlockNoteContext } from "@blocknote/react";
import { AiFillGithub } from "react-icons/ai";
import { SiStackblitz } from "react-icons/si";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import CTAButton from "@/components/CTAButton";
import { SectionHeader } from "@/components/Headings";
import { EXAMPLES_CODE_BLOCK_TABS } from "@/components/example/generated/exampleCodeBlockTabs.gen";
import { authClient } from "@/util/auth-client";

function ExampleDemoBarSourceCodeLink(props: {
  name: string;
  categories: {
    name: string;
    examples: { name: string; isPro: boolean }[];
  }[];
  platform: {
    name: string;
    icon: React.ReactNode;
    baseUrl: string;
  };
}) {
  const [categoryName, exampleName] = props.name.split("/");

  const categoryIndex = props.categories.findIndex(
    (category) => category.name === categoryName,
  );
  const exampleIndex = props.categories[categoryIndex].examples.findIndex(
    (example) => example.name === exampleName,
  );

  return (
    <a
      className={
        "hover:text-fd-accent-foreground flex items-center gap-1 py-2 text-sm font-medium"
      }
      href={`${props.platform.baseUrl}/${(categoryIndex + 1).toString().padStart(2, "0")}-${categoryName}/${(exampleIndex + 1).toString().padStart(2, "0")}-${exampleName}/`}
      target="_blank"
      rel="noreferrer"
    >
      {props.platform.icon}
      <div>{props.platform.name}</div>
    </a>
  );
}

function ExampleDemoBar(props: {
  name: string;
  categories: {
    name: string;
    examples: { name: string; isPro: boolean }[];
  }[];
}) {
  return (
    <div className={"flex items-center gap-4 px-4"}>
      <ExampleDemoBarSourceCodeLink
        {...props}
        platform={{
          name: "GitHub",
          icon: <AiFillGithub size={16} />,
          baseUrl: "https://github.com/TypeCellOS/BlockNote/tree/main/examples",
        }}
      />
      <ExampleDemoBarSourceCodeLink
        {...props}
        platform={{
          name: "StackBlitz",
          icon: <SiStackblitz size={16} />,
          baseUrl:
            "https://www.stackblitz.com/github/TypeCellOS/BlockNote/tree/main/examples",
        }}
      />
    </div>
  );
}

function ExampleDemo(props: {
  name: string;
  categories: {
    name: string;
    examples: { name: string; isPro: boolean }[];
  }[];
}) {
  const Component = dynamic(
    () => import("./example/generated/components/" + props.name + "/index"),
    { ssr: false },
  );

  const { resolvedTheme } = useTheme();

  return (
    <div className="not-prose bg-fd-secondary border-fd-border flex h-[600px] flex-col rounded-xl border">
      <ExampleDemoBar {...props} />
      <div
        className={"bg-fd-background h-0 flex-1 overflow-auto rounded-xl p-4"}
      >
        <BlockNoteContext.Provider
          value={{
            colorSchemePreference: resolvedTheme === "dark" ? "dark" : "light",
          }}
        >
          <Component />
        </BlockNoteContext.Provider>
      </div>
    </div>
  );
}

function ExampleCode(props: { name: string }) {
  const [group, example] = props.name.split("/");
  const tabs: Record<string, string> = (EXAMPLES_CODE_BLOCK_TABS as any)[group][
    example
  ];

  return (
    <Tabs items={Object.keys(tabs)}>
      {Object.entries(tabs).map(([fileName, fileContent]) => (
        <Tab key={fileName} value={fileName}>
          <DynamicCodeBlock
            lang={fileName.split(".").pop()!}
            code={fileContent}
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
      <div className={"z-[5] flex w-2/3 flex-col items-center"}>
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

export default function ClientExample(props: {
  name: string;
  categories: {
    name: string;
    examples: { name: string; isPro: boolean }[];
  }[];
}) {
  const [categoryName, exampleName] = props.name.split("/");
  const exampleIsPro = props.categories
    .find((category) => category.name === categoryName)
    ?.examples.find((e) => e.name === exampleName)?.isPro;

  const session = authClient.useSession();
  const userIsPro = session.data && session.data.planType !== "free";

  return (
    <div className="demo">
      <ExampleDemo {...props} />
      {exampleIsPro && !userIsPro ? (
        <ExampleProPrompt />
      ) : (
        <ExampleCode name={props.name} />
      )}
    </div>
  );
}
