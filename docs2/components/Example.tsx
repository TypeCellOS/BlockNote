"use client";

import { BlockNoteContext } from "@blocknote/react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { AiFillGithub } from "react-icons/ai";
import { SiStackblitz } from "react-icons/si";

import CTAButton from "@/components/CTAButton";
import { SectionHeader } from "@/components/Headings";
import { ExampleData } from "@/components/example/generated/exampleGroupsData.gen";
// import { authClient } from "@/util/auth-client";
// TODO
import * as Sentry from "@sentry/nextjs";

function ExampleDemoBarSourceCodeLink(props: {
  name: string;
  icon: React.ReactNode;
  url: string;
}) {
  return (
    <a
      className={
        "hover:text-fd-accent-foreground text-fd-muted-foreground flex items-center gap-1 py-2 text-sm font-medium"
      }
      href={props.url}
      target="_blank"
      rel="noreferrer"
    >
      {props.icon}
      <div>{props.name}</div>
    </a>
  );
}

function ExampleDemoBar(props: { exampleData: ExampleData }) {
  return (
    <div className={"flex items-center gap-4 px-4"}>
      <ExampleDemoBarSourceCodeLink
        name="GitHub"
        icon={<AiFillGithub size={16} />}
        url={`https://github.com/TypeCellOS/BlockNote/tree/main/${props.exampleData.pathFromRoot}`}
      />
      {props.exampleData.showStackBlitzLink && (
        <ExampleDemoBarSourceCodeLink
          name="StackBlitz"
          icon={<SiStackblitz size={16} />}
          url={`https://www.stackblitz.com/github/TypeCellOS/BlockNote/tree/main/${props.exampleData.pathFromRoot}`}
        />
      )}
    </div>
  );
}

function ExampleDemo(props: { exampleData: ExampleData }) {
  const Component = dynamic(
    () =>
      import(
        "./example/generated/components/" +
          props.exampleData.exampleGroupName +
          "/" +
          props.exampleData.exampleName +
          "/index"
      ),
    { ssr: false },
  );

  const { resolvedTheme } = useTheme();

  return (
    <div className="not-prose bg-fd-secondary border-fd-border flex h-[600px] flex-col rounded-xl border">
      <ExampleDemoBar exampleData={props.exampleData} />
      <div className="bg-fd-background flex h-0 flex-1 flex-col overflow-hidden rounded-xl p-1">
        <div className="border-fd-border bg-fd-secondary h-0 flex-1 overflow-auto rounded-lg border">
          <BlockNoteContext.Provider
            value={{
              colorSchemePreference:
                resolvedTheme === "dark" ? "dark" : "light",
            }}
          >
            <Component />
          </BlockNoteContext.Provider>
        </div>
      </div>
    </div>
  );
}

function ExampleCode(props: { exampleData: ExampleData }) {
  return (
    <Tabs items={Object.keys(props.exampleData.files)}>
      {Object.entries(props.exampleData.files).map(
        ([fileName, fileContent]) => (
          <Tab key={fileName} value={fileName}>
            <DynamicCodeBlock
              lang={fileName.split(".").pop()!}
              code={fileContent}
            />
          </Tab>
        ),
      )}
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
          <CTAButton href={"/pricing"} variant={"colored"} hoverGlow={true}>
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

export default function Example(props: { exampleData: ExampleData }) {
  // TODO
  // const session = authClient.useSession();
  const userIsPro = true; //session.data && session.data.planType !== "free";

  return (
    <Sentry.ErrorBoundary
      fallback={
        <div>
          We encountered an error trying to show this example. Please report
          this to us on GitHub at{" "}
          <a href="https://github.com/TypeCellOS/BlockNote/issues">
            https://github.com/TypeCellOS/BlockNote/issues
          </a>
        </div>
      }
    >
      <div className="demo">
        <ExampleDemo exampleData={props.exampleData} />
        {props.exampleData.isPro && !userIsPro ? (
          <ExampleProPrompt />
        ) : (
          <ExampleCode exampleData={props.exampleData} />
        )}
      </div>
    </Sentry.ErrorBoundary>
  );
}
