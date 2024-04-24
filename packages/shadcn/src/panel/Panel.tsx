import * as ShadCNCard from "../components/ui/card";
import * as ShadCNTabs from "../components/ui/tabs";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const Panel = forwardRef<
  HTMLDivElement,
  ComponentProps["ImagePanel"]["Root"]
>((props, ref) => {
  const {
    className,
    tabs,
    defaultOpenTab,
    openTab,
    setOpenTab,
    // loading,
    // setLoading,
  } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Card = ShadCNComponents?.Card || ShadCNCard.Card;
  const CardContent = ShadCNComponents?.CardContent || ShadCNCard.CardContent;
  const Tabs = ShadCNComponents?.Tabs || ShadCNTabs.Tabs;
  const TabsList = ShadCNComponents?.TabsList || ShadCNTabs.TabsList;
  const TabsTrigger = ShadCNComponents?.TabsTrigger || ShadCNTabs.TabsTrigger;
  const TabsContent = ShadCNComponents?.TabsContent || ShadCNTabs.TabsContent;

  return (
    <Tabs
      className={className}
      ref={ref}
      value={openTab}
      defaultValue={defaultOpenTab}
      onValueChange={setOpenTab}>
      {/*{loading && <LoadingOverlay visible={loading} />}*/}

      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger value={tab.name} key={tab.name}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent value={tab.name} key={tab.name}>
          <Card>
            <ShadCNCard.CardHeader>Test</ShadCNCard.CardHeader>
            <CardContent>{tab.tabPanel}</CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
});
